"""
CompliScore — Flask backend with PDF extraction and live policies/violations.
"""
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import google.generativeai as genai
from dotenv import load_dotenv
import os
import csv
import json
import re
from datetime import datetime

load_dotenv()

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

app = Flask(__name__, static_folder=".", static_url_path="")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
VIOLATIONS_JSON = os.path.join(os.path.dirname(__file__), "violations_data.json")
POLICIES_JSON = os.path.join(os.path.dirname(__file__), "policies_data.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

ALLOWED_EXTENSIONS = {"pdf"}

# Live data: no default policies
policy_list = []  # raw extracted text for Gemini
policy_meta = []  # { id, title, date, version, status } for API


def load_policies():
    global policy_meta, policy_list
    if os.path.exists(POLICIES_JSON):
        try:
            with open(POLICIES_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                policy_meta = data.get("policies", [])
                policy_list = data.get("policy_texts", [])
        except Exception:
            policy_meta = []
            policy_list = []


def save_policies():
    with open(POLICIES_JSON, "w", encoding="utf-8") as f:
        json.dump({"policies": policy_meta, "policy_texts": policy_list}, f, indent=2)

# Load employee records
records = []
_records_path = os.path.join(os.path.dirname(__file__), "records.csv")
if os.path.exists(_records_path):
    with open(_records_path, "r", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row:
                records.append(row)

# Violations store (live)
violations_store = []


def load_violations():
    global violations_store
    if os.path.exists(VIOLATIONS_JSON):
        try:
            with open(VIOLATIONS_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                violations_store = data.get("violations", [])
        except Exception:
            violations_store = []


def save_violations():
    with open(VIOLATIONS_JSON, "w", encoding="utf-8") as f:
        json.dump({"violations": violations_store}, f, indent=2)


load_violations()
load_policies()


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_pdf_text(filepath: str) -> str:
    if PdfReader is None:
        raise RuntimeError("PyPDF2 is not installed. Run: pip install PyPDF2")
    reader = PdfReader(filepath)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


def _parse_gemini_csv_response(text: str):
    """Parse Gemini response into list of violation dicts for API."""
    text = (text or "").strip()
    # Remove markdown code block if present
    if "```" in text:
        text = re.sub(r"^```\w*\n?", "", text).strip()
        text = re.sub(r"\n?```\s*$", "", text).strip()
    lines = []
    for part in text.split("$"):
        part = part.strip()
        if not part:
            continue
        # Each part may be one or more CSV lines (header + row)
        part_lines = [line.strip() for line in part.split("\n") if line.strip()]
        lines.extend(part_lines)
    if not lines:
        return []
    # First line is header
    header = next(csv.reader([lines[0]]))
    header = [h.strip() for h in header]
    idx_id = next((i for i, h in enumerate(header) if "employee" in h.lower() or "id" in h.lower()), 0)
    idx_name = next((i for i, h in enumerate(header) if "name" in h.lower()), 1)
    idx_reason = next((i for i, h in enumerate(header) if "reason" in h.lower()), -1)
    idx_violated = next((i for i, h in enumerate(header) if "violated" in h.lower()), -1)
    violations_out = []
    today = datetime.now().strftime("%Y-%m-%d")
    for line in lines[1:]:
        try:
            row = next(csv.reader([line]))
            if len(row) < 2:
                continue
            emp_id = str(row[idx_id]).strip() if idx_id < len(row) else ""
            name = str(row[idx_name]).strip() if idx_name < len(row) else "—"
            reason = str(row[idx_reason]).strip() if idx_reason >= 0 and idx_reason < len(row) else ""
            violated_by = str(row[idx_violated]).strip() if idx_violated >= 0 and idx_violated < len(row) else ""
            policy_label = (reason[:60] + "…") if len(reason) > 60 else reason or "Policy violation"
            violations_out.append({
                "id": f"V{str(len(violations_store) + len(violations_out) + 1).zfill(3)}",
                "user": emp_id,
                "name": name,
                "policy": policy_label,
                "reason": reason,
                "violated_by": violated_by,
                "severity": "High" if "below" in reason.lower() or "not met" in reason.lower() else "Medium",
                "date": today,
                "status": "Under Review",
            })
        except Exception:
            continue
    return violations_out


# ─── API: Policies (live, no defaults) ───
@app.route("/api/policies", methods=["GET"])
def get_policies():
    return jsonify({"policies": policy_meta})


# ─── API: Upload policy PDF (no Gemini here) ───
@app.route("/api/upload-policy", methods=["POST"])
def upload_policy():
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
        new_id = f"P{str(len(policy_meta) + 1).zfill(3)}"
        today = datetime.now().strftime("%Y-%m-%d")
        meta = {
            "id": new_id,
            "title": title,
            "date": today,
            "version": "v1.0",
            "status": "active",
        }
        policy_meta.append(meta)
        save_policies()

        return jsonify({
            "success": True,
            "filename": filename,
            "title": title,
            "extracted_text": extracted_text,
            "text_preview": extracted_text[:2000] if extracted_text else "",
            "page_count": len(PdfReader(filepath).pages) if PdfReader else 0,
            "message": "PDF uploaded and processed successfully",
            "policy": meta,
        })
    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


# ─── API: Update policy status ───
@app.route("/api/policies/<pid>", methods=["PATCH"])
def update_policy(pid):
    data = request.get_json() or {}
    status = data.get("status")
    if status not in ("active", "suspended", "superseded"):
        return jsonify({"error": "Invalid status"}), 400
    for p in policy_meta:
        if p.get("id") == pid:
            p["status"] = status
            save_policies()
            return jsonify({"policy": p})
    return jsonify({"error": "Policy not found"}), 404


# ─── API: Violations (live) ───
@app.route("/api/violations", methods=["GET"])
def get_violations():
    return jsonify({"violations": violations_store})


@app.route("/api/violations/<vid>", methods=["PATCH"])
def update_violation(vid):
    data = request.get_json() or {}
    status = data.get("status")
    if status not in ("Confirmed", "Dismissed", "Under Review"):
        return jsonify({"error": "Invalid status"}), 400
    for v in violations_store:
        if v.get("id") == vid:
            v["status"] = status
            save_violations()
            return jsonify({"violation": v})
    return jsonify({"error": "Violation not found"}), 404


# ─── API: Generate violations via Gemini (only when admin clicks button) ───
@app.route("/api/generate-violations", methods=["POST"])
def generate_violations():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "GEMINI_API_KEY is not set"}), 500
    if not policy_list:
        return jsonify({"error": "Upload at least one policy PDF before generating violations"}), 400
    if not records:
        return jsonify({"error": "No employee records found (records.csv)"}), 400

    try:
        genai.configure(api_key=api_key)
        command = (
            f"You are given a list of Rules/Policies: {policy_list}. Read it first properly. "
            f"Now you are given a List of Employees {records}. One employee's data is separated from the other using the # symbol. "
            "Find among these members who broke a policy. Add all employees that broke the policies in a proper CSV format with "
            'all existing details, plus "Reason for Violation" and "Violated by how much". '
            "Reply with ONLY the CSV content, nothing else. One row per person. Add '$' after each record (each person's row)."
        )
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(command)
        text = response.text if hasattr(response, "text") else str(response)

        new_violations = _parse_gemini_csv_response(text)
        if not new_violations:
            return jsonify({"error": "Could not parse violations from API response", "raw_preview": (text or "")[:500]}), 500

        # Assign IDs and append
        base = len(violations_store) + 1
        for i, v in enumerate(new_violations):
            v["id"] = f"V{str(base + i).zfill(3)}"
            v["status"] = v.get("status", "Under Review")
        violations_store.extend(new_violations)
        save_violations()

        return jsonify({
            "success": True,
            "violations": violations_store,
            "message": f"Generated {len(new_violations)} violations.",
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate violations: {str(e)}"}), 500


# Serve static files
@app.route("/")
def index():
    return send_from_directory(".", "compliance-app.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
