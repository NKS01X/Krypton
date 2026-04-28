from flask import Flask, request, jsonify
from PIL import Image
import torch
import clip

app = Flask(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def get_embedding(image):
    image = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = model.encode_image(image)
    return embedding.cpu().numpy().tolist()[0]

@app.route('/embed', methods=['POST'])
def embed():
    file = request.files['image']
    image = Image.open(file.stream).convert("RGB")

    embedding = get_embedding(image)

    return jsonify({"embedding": embedding})

if __name__ == '__main__':
    app.run(port=8000)