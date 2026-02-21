"""
CompliScore — Flask backend with PDF extraction for Policy Management.
"""
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import google.generativeai as genai
from dotenv import load_dotenv
import os
load_dotenv()
import csv

policy_list = []
records = []

with open('records.csv', 'r') as file:
    text = csv.reader(file)
    for row in text:
        records.append(row)





#import na hole
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







def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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




# API: Upload and process policy PDF (must be before catch-all)
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
        print(extracted_text)
        policy_list.append(extracted_text)
        

        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key= api_key)



        command = f""" 
        You are given a list of Rules/Policies: {policy_list}. Read it first properly. Now you are given a List of Employees {records}. One emplpyees data is seperated from the other employee using the # symbol. Now you find out among these members that who broke a pocily. Add all the employes that broke the policies in a proper CSV format. With the all the existing details, along with "Reason for Violation" and "Violated by how much". return/reply with just the CSV file nothing else, and it should be a proper CSV file.
        """
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(command)

        print(response.text)


        #eta file store hbe
        with open('violations.csv', mode='w', newline='') as file:
            writer = csv.writer(file)

            
            writer.writerows(response.text)
                #extracted text er modhye text ta royeche.
            return jsonify({
                "success": True,
                "filename": filename,
                "title": title,
                "extracted_text": extracted_text,
                "text_preview": extracted_text[:2000] if extracted_text else "",
                "page_count": len(PdfReader(filepath).pages) if PdfReader else 0,
                "message": "PDF uploaded and processed successfully",
        })
    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500
    


# Serve static files (HTML, JS, CSS)
@app.route("/")
def index():
    return send_from_directory(".", "compliance-app.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)



if __name__ == "__main__":
    app.run(debug=True, port=5000)
