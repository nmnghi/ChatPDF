import {doc, updateDoc, arrayUnion, getDoc, collection, addDoc, onSnapshot, deleteDoc} from 'firebase/firestore'
import { auth, db } from '../../../firebase.config';
import { useState, useEffect } from 'react'
import {assets} from '../../assets/assets'
import './Sidebar.css'

function Sidebar({ updateChatHistory, updateCurrentThread }) {
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const fetchThreads = () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setThreads(userData.chats || []);
          }
        });

        return () => unsubscribe();
      }
    };
    fetchThreads();
  }, []);
  
  const createThread = async () => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      const threadRef = await addDoc(collection(db, 'threads'), {
        userId: user.uid,
        contents: [],
        timestamp: Date.now()
      });
      
      await updateDoc(userRef, {
        chats: arrayUnion({
          threadId: threadRef.id,
          threadTitle: 'New chat', 
        })
      });
    } else {
      alert('You must log in to use this feature.');
    }
  };

  const handleThreadClick = async (threadId) => {
    updateCurrentThread(threadId);
    const threadRef = doc(db, 'threads', threadId);
    const threadDoc = await getDoc(threadRef);
    if (threadDoc.exists()) {
      const threadData = threadDoc.data();
      updateChatHistory(threadData.contents || []);
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      const threadRef = doc(db, 'threads', threadId);
      await deleteDoc(threadRef);
      console.log('Thread deleted successfully from threads collection');

      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedChats = userData.chats.filter(chat => chat.threadId !== threadId);
          await updateDoc(userRef, {
            chats: updatedChats
          });
          console.log('Thread reference deleted successfully from users collection');
          
          updateChatHistory([]);
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  return (
    <div className="sidebar">
      <div className="top">
        <div className="new-chat" onClick={createThread}>
          <img src={assets.plus_icon} alt="" />
          <p>New Chat</p>
        </div>
        <div className="recent">
          <p className="recent-title">Recent</p>
          {threads.map((thread, index) => (
              <div key={index} className="recent-entry" onClick={() => handleThreadClick(thread.threadId)}>
                <img src={assets.message_icon} alt="" />
                <p>{thread.threadTitle}</p>
                <button onClick={() => handleDeleteThread(thread.threadId)}>
                  <img src={assets.trash_icon} alt="" />
                </button>
              </div>
            ))}
        </div>
      </div>
      <div className="bottom">
        <div className="bottom-item">
          <img src={assets.question_icon} alt="" />
          <p>Help</p>
        </div>

        <div className="bottom-item">
          <img src={assets.history_icon} alt="" />
          <p>Activity</p>
        </div>

        <div className="bottom-item">
          <img src={assets.setting_icon} alt="" />
          <p>Setting</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar