FROM python:3.11-slim

USER root

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake pkg-config \
    curl ca-certificates gnupg lsb-release \
    ffmpeg libsndfile1 git git-lfs \
    libgl1 libglib2.0-0 \
 && git lfs install \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    numpy pandas scipy scikit-learn \
    matplotlib seaborn jupyterlab notebook ipywidgets \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu \
    transformers datasets tokenizers sentencepiece \
    accelerate peft evaluate \
    sentence-transformers spacy \
    faiss-cpu chromadb \
    fastapi uvicorn[standard] gunicorn \
    gradio streamlit \
    rich loguru tqdm pyyaml \
    huggingface_hub \
    pydantic \
    flask-cors

RUN python -m spacy download en_core_web_sm || true

COPY .devcontainer/scripts/install-tools.sh /tmp/
RUN bash /tmp/install-tools.sh || true

EXPOSE 8888 7860 8501 3000
