import { useState, useRef } from 'react';
import { assets } from '../../assets/assets';
import Avatar from '../../assets/chatpdf_avatar.json';
import Lottie from 'lottie-react';
import './Window.css';

const Window = () => {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const createMsgElement = (content, type) => ({
    id: Date.now(),
    type,
    content
  });

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      await uploadFile(selectedFile);
    }
  };

  const typingEffect = (text, delay) => {
    return new Promise((resolve) => {
      let index = 0;
      let typingMessage = "";
  
      const interval = setInterval(() => {
        if (index < text.length) {
          typingMessage += text[index];
          index++;
        } else {
          clearInterval(interval);
          console.log(chatHistory);
          resolve();
        }
  
        setChatHistory((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = createMsgElement(typingMessage, "bot");
          return updatedMessages;
        });
      }, delay);
    });
  };

  const sendMessage = async () => {
    try {
      const formData = new FormData();
      formData.append("msg", input);
      const res = await fetch("http://127.0.0.1:8000/response", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return data.response.replace(/\*\*([^*]+)\*\*/g, "$1");
    } catch (error) {
      console.error("Error fetching response:", error);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file.");
    }
  };

  const onHandleSubmit = async (e) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput('');
    const userMsg = createMsgElement(userMessage, 'user');
    setChatHistory((prevMessages) => [...prevMessages, userMsg]);

    const loadingMsg = createMsgElement("Just a second...", "bot");
    setChatHistory((prevMessages) => [...prevMessages, loadingMsg]);

    try {
      const botResponse = await sendMessage();
      await typingEffect(botResponse, 30);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const onHandleDelete = () => {
    setInput('');
  };

  return (
    <div className='main'>
      <div className="nav">
        <p>ChatPDF</p>
        <img src={assets.user_icon} alt="Avatar" />
      </div>
      <div className="main-container">
        <div className="greet">
          <p><span>Hello, Dev.</span></p>
          <p>How can I help you today?</p>
        </div>

        <div className="suggestions">
          {["Lorem ipsum dolor sit amet consectetur adipisicing elit", "Lorem ipsum dolor sit amet consectetur adipisicing elit", "Lorem ipsum dolor sit amet consectetur adipisicing elit", "Lorem ipsum dolor sit amet consectetur adipisicing elit"].map((suggestion, index) => (
            <div className="suggestion-item" key={index}>
              <p>{suggestion}</p>
              <span className="material-symbols-outlined">lightbulb</span>
            </div>
          ))}
        </div>

        <div className="chats-container">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.type}-message ${msg.type === "bot" ? "loading" : ""}`}>
              {msg.type === "bot" ? (
                <>
                  <Lottie className="avatar" animationData={Avatar} />
                  <p className="message-text">{msg.content || "Loading..."}</p>
                </>
              ) : (
                <p className="message-text">{msg.content}</p>
              )}
            </div>
          ))}
        </div>

        <div className="prompt-container">
          <div className='prompt-wrapper'>
            <div className='prompt-search'>
              <input
                className='prompt-input'
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Message ChatPDF'
                required
              />
              <div className='prompt-actions'>
                <div>
                  <button
                    id='add-file-btn'
                    className="material-symbols-outlined"
                    onClick={handleButtonClick}
                  >
                    attach_file
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>
                <button
                  id='send-btn'
                  className="material-symbols-outlined"
                  onClick={onHandleSubmit}
                >
                  send
                </button>
              </div>
            </div>
            <button id='theme-toggle-btn' className="material-symbols-outlined">light_mode</button>
            <button id='delete-btn' className="material-symbols-outlined" onClick={onHandleDelete}>delete</button>
          </div>

          <p className='bottom-info'>ChatPDF can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
};

export default Window;