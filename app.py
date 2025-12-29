# app.py - Micro-application pour la conversion Roster PDF -> JSON

import os
import re
import json
import uuid
from datetime import datetime, timedelta
import pdfplumber
import io

from flask import Flask, request, jsonify

# --- MAPPINGS ET CONFIGURATION GLOBALE ---
DAY_HEADERS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]
CODE_MAPPING = {
    'CW': 'REPOS COMPENSATOIRE', 'RW': 'REPOS HEBDOMADAIRE', 
    'RT': 'REPOS EN TERRITOIRE', 'CV': 'CONGÉ', 
    'RES': 'RÉSERVE', 'HSBR': 'HORS SERVICE - BRUXELLES', 
    'F': 'FORMATION'
}

# --- FONCTIONS DE LOGIQUE ---
def parse_time_with_overflow(time_str):
    """Gère les heures au-delà de 24:00 (ex: 25:55 -> 01:55 le jour suivant)."""
    hours, minutes = map(int, time_str.split(':'))
    days_overflow = hours // 24
    normalized_hours = hours % 24
    return normalized_hours, minutes, days_overflow

def extract_roster_data(pdf_file_stream, agent_id="AGENT_ID_DEFAUT"):
    """
    Fonction principale: ouvre le PDF via le flux binaire, extrait les tables et génère le JSON.
    """
    
    shifts = []
    logs = {"total_shifts_detectes": 0, "shifts_convertis": 0, "erreurs": []}
    
    # NOTE : Dans un environnement réel, la date de début pourrait être extraite du PDF.
    # Pour l'instant, on utilise une date par défaut et on demande à l'utilisateur de la vérifier.
    try:
        # Tente d'extraire la date du nom de fichier, sinon utilise une date par défaut
        # Dans un vrai déploiement, cette info viendrait du formulaire web
        start_date_str = datetime.now().strftime("%Y-%m-01") 
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except Exception:
        logs["erreurs"].append("Date de début non fournie/non parsable. Utilisation de la date du jour.")
        start_date = datetime.now()


    try:
        pdf_stream = pdf_file_stream
        
        with pdfplumber.open(pdf_stream) as pdf:
            current_serie = "INCONNU"
            current_periode = "INCONNU"
            
            # --- Traitement Page par Page ---
            for page in pdf.pages:
                
                # 1. Détection de l'en-tête de la série pour la page
                text_page = page.extract_text()
                match_serie = re.search(r'\[(FL-[A-E])\]:.*?Liege serie - ([A-Z]) \((.*?)\) PERIODE Z SUP 0', text_page)
                if match_serie:
                    current_serie = match_serie.group(1)
                    details = match_serie.group(3).lower()
                    current_periode = "JOUR" if 'matins' in details or 'journées' in details else "NUIT/TARD"
                
                # 2. Extraire la table
                tables = page.extract_tables()
                
                for table in tables:
                    if not table or not table[0] or table[0][0] != "Week":
                        continue

                    # Boucle sur les lignes de données du Roster
                    for row_index, row in enumerate(table[1:]):
                        try:
                            week_number_str = row[0].strip()
                            if not week_number_str.isdigit(): continue
                            
                            week_number = int(week_number_str)
                            week_start_offset = (week_number - 1) * 7
                            
                            # Parcourir les 7 jours (R1 à R7)
                            for day_index, cell_content_raw in enumerate(row[1:8]):
                                
                                # Date du shift
                                current_shift_date = start_date + timedelta(days=week_start_offset + day_index)
                                
                                cell_content = " ".join(cell_content_raw.split()) if cell_content_raw else ""
                                cell_content = cell_content.strip()
                                
                                if not cell_content: continue

                                logs["total_shifts_detectes"] += 1

                                # --- Traitement ---
                                if cell_content in CODE_MAPPING:
                                    shift_type = CODE_MAPPING[cell_content]
                                    is_swappable = False
                                    start_time = end_time = code_train = "N/A"
                                
                                else:
                                    # Shift de Conduite
                                    match_shift = re.match(r'(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s*(FL\d{3})?', cell_content)
                                    
                                    if match_shift:
                                        start_time_str = match_shift.group(1)
                                        end_time_str = match_shift.group(2)
                                        code_train = match_shift.group(3) if match_shift.group(3) else 'INCONNU'
                                        
                                        start_h, start_m, start_d_overflow = parse_time_with_overflow(start_time_str)
                                        end_h, end_m, end_d_overflow = parse_time_with_overflow(end_time_str)
                                        
                                        start_time = f"{start_h:02d}:{start_m:02d}"
                                        end_time = f"{end_h:02d}:{end_m:02d}"
                                        shift_type = "CONDUITE"
                                        is_swappable = True
                                    
                                    else:
                                        logs["erreurs"].append(f"Parsing échoué pour: {cell_content} ({current_shift_date.strftime('%Y-%m-%d')})")
                                        continue

                                # Construction du Shift final (respect du schéma JSON)
                                new_shift = {
                                    "shift_id": str(uuid.uuid4()),
                                    "agent_id": agent_id,
                                    "serie": current_serie,
                                    "periode": current_periode,
                                    "date": current_shift_date.strftime("%Y-%m-%d"),
                                    "jour_semaine": current_shift_date.strftime("%A"),
                                    "semaine_numero": week_number,
                                    "start_time": start_time,
                                    "end_time": end_time,
                                    "type": shift_type,
                                    "code_train": code_train,
                                    "is_swappable": is_swappable,
                                    "metadata": {
                                        "source": f"Roster {current_serie}, Week {week_number}, {DAY_HEADERS[day_index]}",
                                        "original_content": cell_content,
                                        "validation_status": "pending"
                                    }
                                }
                                shifts.append(new_shift)
                                logs["shifts_convertis"] += 1

                        except Exception as e:
                            logs["erreurs"].append(f"Erreur fatale lors du traitement d'une ligne de roster: {e}")

    except Exception as e:
        logs["erreurs"].append(f"Erreur lors de l'ouverture ou du traitement du PDF: {e}")
        return {"error": f"Erreur de traitement PDF: {e}"}, 500
        
    return {"shifts": shifts, "logs": logs}, 200

# --- INITIALISATION FLASK ---
app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    # Page d'accueil simple pour tester le déploiement
    return "<h1>Roster to JSON Converter (SNCB)</h1><p>POST your PDF file to the /upload endpoint.</p>"

@app.route('/upload', methods=['POST'])
def upload_file():
    
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier 'file' n'a été fourni"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "Nom de fichier invalide"}), 400

    if not file.filename.endswith('.pdf'):
        return jsonify({"error": "Type de fichier non supporté. Veuillez uploader un PDF."}), 415

    # Le fichier est valide, lisez-le en mémoire
    pdf_stream = io.BytesIO(file.read())
    
    # Tentative d'extraire l'AGENT_ID (si l'utilisateur le passe via le formulaire/l'API)
    agent_id = request.form.get('agent_id', 'AGENT_ID_DEFAUT') 

    # Appel du moteur d'extraction principal
    result, status_code = extract_roster_data(pdf_stream, agent_id)
    
    # Retourner le résultat
    return jsonify(result), status_code

if __name__ == '__main__':
    # Lance le serveur sur le port spécifié par l'environnement (standard pour Cloud Run)
    PORT = int(os.environ.get('PORT', 8080))
    app.run(debug=False, host='0.0.0.0', port=PORT)
