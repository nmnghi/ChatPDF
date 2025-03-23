import os
import re
import fitz
import numpy as np
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS, DistanceStrategy
from langchain_experimental.text_splitter import SemanticChunker

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPEN_API_KEY")
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


def preprocess(text):
    # Lower query
    text = text.lower()
    # Remove special characters
    text = re.sub(r"[^\w\s]", "", text)
    # Remove white space
    text = text.strip()
    return text


def read_pdf_to_string(filepath):
    doc = fitz.open(filepath)
    text = ""
    for page_num in range(len(doc)):
        page = doc[page_num]
        text += page.get_text()
    return text


def chunking(text, embeddings):
    text_splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=90,
        min_chunk_size=30,
    )
    return text_splitter.create_documents([text])


def encode_pdf(path):
    text = read_pdf_to_string(path)
    embeddings = OpenAIEmbeddings()
    docs = chunking(text, embeddings)
    vector_store = FAISS.from_documents(
        docs, embeddings, distance_strategy=DistanceStrategy.COSINE
    )
    return vector_store


def encoding(text):
    return OpenAIEmbeddings().embed_query(text)


def cosine_similarity(vector1, vector2):
    return np.dot(vector1, vector2) / (
        np.linalg.norm(vector1) * np.linalg.norm(vector2)
    )


def euclid_distance(vector1, vector2):
    vector1 = np.array(vector1)
    vector2 = np.array(vector2)
    return np.linalg.norm(vector1 - vector2)
