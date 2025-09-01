from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Charger le modèle IA
model = joblib.load("model.pkl")

# Définir les colonnes attendues dans la requête
colonnes = [
    "anciennete_jours", "montant", "heure", "nouveau_beneficiaire",
    "solde_avant", "nb_virements_1h", "changement_mdp",
    "minutes_depuis_chg_mdp", "localisation", "nb_virements_vers_benef"
]


@app.route("/", methods=["GET"])
def accueil():
    return "<h3>Bienvenue sur l'API de détection de fraude bancaire</h3><p>Utilisez l'endpoint <code>/predict</code> avec POST pour analyser une transaction.</p>"


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        df = pd.DataFrame([data], columns=colonnes)

        print("Colonnes reçues :", df.columns.tolist()) 
        print("Contenu reçu :", df.to_dict()) 

        # Vérifier que toutes les colonnes sont présentes
        if df.isnull().any().any():
            return jsonify({"error": "Colonnes manquantes ou mal formatées"}), 400

        # Prédiction
        prediction = model.predict(df)[0]
        resultat = bool(prediction)
        return jsonify({"fraude": resultat})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
