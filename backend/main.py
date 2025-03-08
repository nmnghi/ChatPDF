from helper_functions import *
from semantic_router.layer import Route, RouteLayer
from semantic_router.encoders import OpenAIEncoder
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile, Form, Depends
import uvicorn

#==========================================================================#
#             Implement API for chatbot backend and frontend               #
#==========================================================================#

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.post("/response")
def response(msg: str = Form(...), top_k: int = Form(...)):
    return {"response": get_chat_response(msg, top_k)}

@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):
    global db_vectors

    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())

    db_vectors = encode_pdf(filepath)

    return {"message": "File uploaded and processed successfully"}

#==========================================================================#
#             Implement RAG techniques and Semantic router                 #
#==========================================================================#

rag_template = """
Use only the following context to answer the user's query in a well-formatted, concise, and clear manner sentences. If the query is related to the provided PDF document but the answer is not found in it, respond with: "The PDF document you provided does not contain information for your question!".  

Câu hỏi:  
{question}  

Trả lời:  
{context}  
"""

normal_template = """
You are a chatbot that helping user analyze and summarize information from a PDF file. Respond appropriately based on the type of input:

- If the user greets you (e.g., "hello", "hi", "good morning"), respond with a friendly and engaging greeting.
- If the user asks what you can do or who you are, respond with: "I am ChatPDF. I can help you analyze and summarize information from a PDF file. You can upload a PDF, and I'll assist with answering questions and summarizing its content."
- If the user thanks you, respond politely and warmly.

Câu hỏi:  
{question}
"""

rag_prompt = ChatPromptTemplate.from_template(rag_template)
normal_prompt = ChatPromptTemplate.from_template(normal_template)
chat_model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)

# Define routes for semantic routing
routes = [
    Route(
        name="chitchat",
        utterances=[
            "Hello",
            "Hi",
            "Good morning",
            "Hey",
            "Thank you",
            "Thanks",
            "Appreciate it",
            "Who are you?",
            "What can you do?",
            "What are you?",
            "How are you?",
            "Nice to meet you",
        ],
    ),
]

rl = RouteLayer(encoder=OpenAIEncoder(), routes=routes)
db_vectors = encode_pdf("uploads/DSDM.pdf")

def get_chat_response(text: str, top_k: int):
    text = preprocess(text)
    route = rl(text).name

    if route == "chitchat":
        normal_chain = normal_prompt | chat_model | StrOutputParser()
        return normal_chain.invoke({"question": text})
    else:
        chunks_query_retriever = db_vectors.as_retriever(search_kwargs={"k": top_k})
        
        related_chunks = chunks_query_retriever.get_relevant_documents(text)

        answer = "\n\n".join([chunk.page_content for chunk in related_chunks])

        semantic_rag_chain = (
            rag_prompt
            | chat_model
            | StrOutputParser()
        )

        return semantic_rag_chain.invoke({"context": answer, "question": text})
    
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)