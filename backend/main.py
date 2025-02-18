import os
from dotenv import load_dotenv 
from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from helper_functions import *

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv('OPEN_API_KEY')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
db_vectors = None

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.post("/response")
def response(msg: str = Form(...)):
    return {"response": get_chat_response(msg)}

@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):
    global db_vectors
    
    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())

    db_vectors = encode_pdf(filepath)

    return {"message": "File uploaded and processed successfully"}

rag_template = """
Use only the following context to answer the user's query in a well-formatted, concise and clear manner sentences. If you don't have an answer, respond "The PDF document you provided does not contain information for your question!".

Câu hỏi:
{question}

Trả lời:
{context}
"""

rag_prompt = ChatPromptTemplate.from_template(rag_template)
chat_model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)

def get_chat_response(text: str):
    text = preprocess(text)
    if db_vectors:
        chunks_query_retriever = db_vectors.as_retriever(search_kwargs={"k": 5})

        semantic_rag_chain = (
            {"context": chunks_query_retriever, "question": RunnablePassthrough()}
            | rag_prompt
            | chat_model
            | StrOutputParser()
        )
        return semantic_rag_chain.invoke(text)
    else:
        return chat_model.invoke(text).content
