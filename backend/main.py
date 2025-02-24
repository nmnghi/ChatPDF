from helper_functions import *
from langchain_openai import ChatOpenAI
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from fastapi import FastAPI, File, UploadFile, Form, Depends

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
Use only the following context to answer the user's query in a well-formatted, concise, and clear manner sentences. If the query is related to the provided PDF document but the answer is not found in it, respond with: "The PDF document you provided does not contain information for your question!".  

Câu hỏi:  
{question}  

Trả lời:  
{context}  
"""

normal_template = """
You are a friendly and helpful chatbot that interacts naturally with users. Respond appropriately based on the type of input:

- If the user greets you (e.g., "hello", "hi", "good morning"), respond with a friendly and engaging greeting.
- If the user thanks you, respond politely and warmly.
- If the user asks what you can do or who you are, respond with: "I am ChatPDF. I can help you analyze and summarize information from a PDF file. You can upload a PDF, and I'll assist with answering questions and summarizing its content."
- If the user asks something else, respond naturally and appropriately.

Câu hỏi:  
{question}

Trả lời:
"""

rag_prompt = ChatPromptTemplate.from_template(rag_template)
normal_prompt = ChatPromptTemplate.from_template(normal_template)
chat_model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)

def get_chat_response(text: str):
    text = preprocess(text)

    if db_vectors == None:  
        normal_chain = normal_prompt | chat_model | StrOutputParser()
        return normal_chain.invoke({"question": text})
    
    chunks_query_retriever = db_vectors.as_retriever(search_kwargs={"k": 5, "score_threshold": 0.7})
    semantic_rag_chain = (
        {"context": chunks_query_retriever, "question": RunnablePassthrough()}
        | rag_prompt
        | chat_model
        | StrOutputParser()
    )

    response = semantic_rag_chain.invoke(text)

    if response == "The PDF document you provided does not contain information for your question!":
        normal_chain = normal_prompt | chat_model | StrOutputParser()
        return normal_chain.invoke({"question": text})

    return response