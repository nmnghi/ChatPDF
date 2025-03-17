import React, { useState } from 'react';
import './Help.css';
import faqs from '../../assets/faqs'
import Card from './Card'

const Help = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleAccordion = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="help">
            <div className="help-header">
                <div className="help-title">
                    <h2>Help Center</h2>
                </div>
            </div>

            <div className="instructions">
                <div className="instruction-cards">
                    <Card 
                        icon="biotech" 
                        title="For Researchers" 
                        description="Explore scientific papers, academic articles, and books to get the information you need for your research."
                    />
                    <Card 
                        icon="school" 
                        title="For Students" 
                        description="Study for exams, get help with homework, and answer multiple choice questions faster than your classmates."
                    />
                </div>

                <div className="instruction-cards">
                    <Card 
                        icon="star_shine" 
                        title="For Professionals" 
                        description="Navigate legal contracts, financial reports, manuals, and training material. Ask questions to any PDF to stay ahead."
                    />
                    <Card 
                        icon="handshake" 
                        title="For Enthusiasts" 
                        description="Explore new fields and improve your personal knowledge."
                    />
                </div>
            </div>

            <div className="faq-container">
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <div 
                            className={`faq-question ${activeIndex === index ? 'active' : ''}`} 
                            onClick={() => toggleAccordion(index)}
                        >
                            {faq.question}
                            <span className="material-symbols-outlined arrow-icon">
                                {activeIndex === index ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                            </span>
                        </div>
                        {activeIndex === index && (
                            <div className="faq-answer">
                                {faq.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Help;
