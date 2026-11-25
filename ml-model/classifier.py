import joblib

model = joblib.load("model.pkl")

CONFIDENCE_THRESHOLD = 0.65

def classify_question(question):

    probabilities = model.predict_proba([question])[0]

    best_index = probabilities.argmax()

    intent = model.classes_[best_index]
    confidence = probabilities[best_index]

    if confidence < CONFIDENCE_THRESHOLD:
        intent = "unsupported"

    return {
        "intent": intent,
        "confidence": round(float(confidence), 4)
    }


if __name__ == "__main__":

    question = input("Ask A.L.I.S.T.O.: ")

    print(classify_question(question))