"""
CompliScore ? Flask backend with PDF extraction and violation generation.
"""
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import date
import csv
import os

load_dotenv()

policy_list = []
records = []

with open("records.csv", "r") as file:
    text = csv.reader(file)
    for row in text:
        records.append(row)

# Import PyPDF2 if available
try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

app = Flask(__name__, static_folder=".", static_url_path="")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

ALLOWED_EXTENSIONS = {"pdf"}
DB_ALLOWED_EXTENSIONS = {"csv", "txt"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_db_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in DB_ALLOWED_EXTENSIONS


def extract_pdf_text(filepath: str) -> str:
    """Extract text from a PDF file."""
    if PdfReader is None:
        raise RuntimeError("PyPDF2 is not installed. Run: pip install PyPDF2")
    reader = PdfReader(filepath)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


VIOLA_PATH = os.path.join(os.path.dirname(__file__), "viola.txt")


def _parse_viola_txt():
    """Parse viola.txt into list of violation dicts for the frontend."""
    violations = []
    if not os.path.isfile(VIOLA_PATH):
        return violations
    with open(VIOLA_PATH, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f if ln.strip()]
    data_idx = 0
    for line in lines:
        if line.lower().startswith("employee_id"):
            continue  # skip header
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 6:
            continue
        data_idx += 1
        emp_id = parts[0]
        name = parts[1]
        reason = ",".join(parts[6:-1]).strip() if len(parts) > 7 else (parts[6] if len(parts) > 6 else "")
        violated_by = parts[-1] if len(parts) > 6 else ""
        violations.append({
            "id": f"V{data_idx:03d}",
            "user": emp_id,
            "name": name,
            "policy": "Policy Violation",
            "severity": "High",
            "date": date.today().isoformat(),
            "status": "Confirmed",
            "reason": reason,
            "violated_by": violated_by,
        })
    return violations


@app.route("/api/violations", methods=["GET"])
def get_violations():
    """Return violations from viola.txt for the violation monitor section."""
    try:
        violations = _parse_viola_txt()
        return jsonify({"success": True, "violations": violations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload-policy", methods=["POST"])
def upload_policy():
    """
    Upload and process a policy PDF.
    Only extracts and stores text. Gemini analysis is triggered separately.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]
    title = request.form.get("title", "").strip()

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed"}), 400

    if not title:
        return jsonify({"error": "Policy title is required"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    try:
        extracted_text = extract_pdf_text(filepath)
        policy_list.append(extracted_text)

        return jsonify(
            {
                "success": True,
                "filename": filename,
                "title": title,
                "extracted_text": extracted_text,
                "text_preview": extracted_text[:2000] if extracted_text else "",
                "page_count": len(PdfReader(filepath).pages) if PdfReader else 0,
                "message": "PDF uploaded and processed successfully",
            }
        )
    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


@app.route("/api/generate-violations", methods=["POST"])
def generate_violations():
    """
    Use Gemini (via GEMINI_API_KEY) and the current policy_list + records
    to generate violations, store them in violations.csv, and return them
    as structured JSON for the frontend.
    """
    if not policy_list:
        return jsonify({"error": "No policies uploaded yet."}), 400

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "GEMINI_API_KEY is not configured."}), 500

    genai.configure(api_key=api_key)

    command = f"""
    You are given a list of Rules/Policies: {policy_list}. Read it first properly.
    Now you are given a List of Employees {records}. One employee's data is separated
    from the other using the # symbol. Find which employees broke a policy.

    Add all employees that broke the policies in a proper CSV format with all the
    existing details, along with Reason for Violation and Violated by how much.
    Reply with just the CSV content, nothing else. Use a proper CSV format.
    Generate your response in the same format and add all the reasons of violation
    at the end of each record. Avoid data discrepancy ? each person should have only
    one row containing the previous format and all the reasons. Add '$' after the
    record of each person.
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(command)

        raw_text = response.text or ""

        # Store response in violations.csv (split by '$' per person)
        with open("violations.csv", mode="w", newline="") as file:
            writer = csv.writer(file)
            space = ""
            for ch in raw_text:
                if ch == "$":
                    space = space + "$"
                    writer.writerow([space])
                    space = ""
                else:
                    space += ch
            if space.strip():
                writer.writerow([space])
        



        # Parse violations.csv into structured objects for the frontend
        violations = []
        
        try:
            with open("violations.csv", newline="") as vf:
                for idx, row in enumerate(vf, start=1):
                    line = row.strip()
                    if not line:
                        continue
                    cols = [c.strip() for c in line.split(",")]
                    emp_id = cols[0] if len(cols) > 0 else ""
                    name = cols[1] if len(cols) > 1 else ""
                    reason = cols[-2] if len(cols) > 2 else ""

                    violations.append(
                        {
                            "id": f"V{idx:03d}",
                            "user": emp_id,
                            "name": name,
                            "policy": "Policy Violation",
                            "severity": "High",
                            "date": date.today().isoformat(),
                            "status": "Confirmed",
                            "reason": reason,
                        }
                    )
            viola = (response.text).split("$")
            with open("viola.txt", "w") as file:
                for i in viola:
                    file.write(i)
        except Exception:
            violations = []

        return jsonify({"success": True, "violations": violations})
    except Exception as e:
        return jsonify({"error": f"Failed to generate violations: {str(e)}"}), 500


@app.route("/api/upload-database", methods=["POST"])
def upload_database():
    """
    Admin endpoint to upload core datasets:
    - kind=records   → replaces records.csv used for policy analysis
    - kind=violations → replaces viola.txt used for live violations feed
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400

    file = request.files["file"]
    kind = (request.form.get("kind") or "").strip().lower()

    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not allowed_db_file(file.filename):
        return jsonify({"success": False, "error": "Only .csv or .txt files are allowed for database uploads"}), 400

    if kind not in {"records", "violations"}:
        return jsonify({"success": False, "error": "Invalid kind. Expected 'records' or 'violations'."}), 400

    filename = "records.csv" if kind == "records" else os.path.basename(VIOLA_PATH)
    target_path = os.path.join(os.path.dirname(__file__), filename)

    try:
        file.save(target_path)

        global records
        if kind == "records":
            # Reload records from the newly uploaded CSV
            new_records = []
            with open(target_path, "r") as f:
                reader = csv.reader(f)
                for row in reader:
                    new_records.append(row)
            records = new_records
            return jsonify({"success": True, "message": "Employee records uploaded and reloaded successfully.", "count": len(records)})
        else:
            # Violations file is read lazily by /api/violations
            return jsonify({"success": True, "message": "Violations file uploaded successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to upload database file: {str(e)}"}), 500


@app.route("/")
def index():
    """Serve main SPA."""
    return send_from_directory(".", "compliance-app.html")


@app.route("/<path:path>")
def serve_static(path):
    """Serve static assets (JS, CSS, etc.)."""
    return send_from_directory(".", path)


if __name__ == "__main__":
    app.run(debug=True, port=5000)


