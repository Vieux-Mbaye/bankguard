import requests
import time
import pymongo
from pymongo import MongoClient

# Connexion à MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["bankguard"]
collection = db["journals"]

dernier_id = None

while True:
    try:
        # Chercher le dernier journal
        journal = collection.find_one(sort=[("_id", -1)])

        # Vérifier s’il est nouveau
        if journal and journal["_id"] != dernier_id:
            dernier_id = journal["_id"]

            # Vérification des champs attendus
            champs_requis = [
                "anciennete_jours", "montant", "heure", "nouveau_beneficiaire",
                "solde_avant", "nb_virements_1h", "changement_mdp",
                "minutes_depuis_chg_mdp", "localisation", "nb_virements_vers_benef"
            ]

            if all(champ in journal for champ in champs_requis):
                # Construction des données pour le modèle
                data = {
                    "anciennete_jours": journal["anciennete_jours"],
                    "montant": journal["montant"],
                    "heure": journal["heure"],
                    "nouveau_beneficiaire": journal["nouveau_beneficiaire"],
                    "solde_avant": journal["solde_avant"],
                    "nb_virements_1h": journal["nb_virements_1h"],
                    "changement_mdp": journal["changement_mdp"],
                    "minutes_depuis_chg_mdp": journal["minutes_depuis_chg_mdp"],
                    "localisation": journal["localisation"],
                    "nb_virements_vers_benef": journal["nb_virements_vers_benef"]
                }

                print("\n Données envoyées à l’API :", data) 

                response = requests.post("http://localhost:5050/predict", json=data)
                print("Réponse de l’API :", response.json()) 

            else:
                champs_absents = [champ for champ in champs_requis if champ not in journal]
                print("Journal incomplet, champs manquants :", champs_absents) 

    except Exception as e:
        print("Erreur lors de la récupération ou de l’envoi :", str(e)) 

    time.sleep(2)
