import React, { useState, useRef, useEffect } from "react";
import "./VoiceChatBot.css";

const API_URL = "https://api.openai.com/v1/chat/completions";

const LANGUAGES = {
  english: "en-US",
  urdu: "ur-PK",
  hindi: "hi-IN",
};

const VoiceChatBot = () => {
  const [speaking, setSpeaking] = useState(false);
  const [listeningEffect, setListeningEffect] = useState(false);
  const [active, setActive] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [currentLang, setCurrentLang] = useState(LANGUAGES.english);

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const voicesRef = useRef([]);

  /* ---------- Load Voices ---------- */
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    voicesRef.current = voices.filter(
      (v) =>
        v.lang.startsWith(currentLang.split("-")[0]) &&
        v.name.toLowerCase().includes("female")
    );

    if (voicesRef.current.length === 0) {
      voicesRef.current = voices.filter((v) =>
        v.lang.startsWith(currentLang.split("-")[0])
      );
    }

    if (voicesRef.current.length === 0) voicesRef.current = voices;
  };

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [currentLang]);

  /* ---------- Phonetic Map ---------- */
  const phoneticMap = {
    urdu: { "آپ": "aap", "کیسے": "kaise", "ہیں": "hain", "ہیلو": "hello", "کیا": "kya", "حال": "haal" },
    hindi: { "आप": "aap", "कैसे": "kaise", "हैं": "hain", "नमस्ते": "namaste", "क्या": "kya", "हाल": "haal" },
  };

  /* ---------- Speak Function ---------- */
  const speakText = (text, lang = currentLang) => {
    if (utteranceRef.current) window.speechSynthesis.cancel();

    let speakStr = text;
    let voiceLang = lang;

    let voice = voicesRef.current.find((v) =>
      v.lang.startsWith(lang.split("-")[0])
    );

    if (!voice) {
      if (lang === LANGUAGES.urdu) {
        speakStr = text.split(" ").map(w => phoneticMap.urdu[w] || w).join(" ");
        voiceLang = "en-US";
      } else if (lang === LANGUAGES.hindi) {
        speakStr = text.split(" ").map(w => phoneticMap.hindi[w] || w).join(" ");
        voiceLang = "en-US";
      }
    }

    const utterance = new SpeechSynthesisUtterance(speakStr);
    utterance.lang = voiceLang;
    utterance.pitch = 1.2;
    utterance.rate = 0.9;
    utterance.voice = voice || voicesRef.current[0] || null;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  /* ---------- Speech Recognition ---------- */
  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startRecognition = (lang) => {
    stopRecognition();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang;

    recognition.onstart = () => setListeningEffect(true);

    recognition.onresult = async (event) => {
      const text = event.results[event.results.length - 1][0].transcript.trim();
      setLastMessage(text);
      setListeningEffect(true);

      let newLang = currentLang;
      if (text.toLowerCase().includes("urdu")) newLang = LANGUAGES.urdu;
      else if (text.toLowerCase().includes("hindi")) newLang = LANGUAGES.hindi;
      else if (text.toLowerCase().includes("english")) newLang = LANGUAGES.english;

      if (newLang !== currentLang) {
        setCurrentLang(newLang);
        speakText(`Okay, now I will speak in ${text}`, newLang);
        setTimeout(() => startRecognition(newLang), 500);
        return;
      }

      const updated = [...conversation, { role: "user", content: text }];
      setConversation(updated);
      await handleMessage(updated);
    };

    recognition.onend = () => {
      if (active) setTimeout(() => startRecognition(currentLang), 300);
      else setListeningEffect(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  /* ---------- OpenAI Bot ---------- */
  const handleMessage = async (messages) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: "",
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages }),
      });

      const data = await response.json();
      const botReply = data.choices?.[0]?.message?.content || "I couldn't understand.";
      setConversation(prev => [...prev, { role: "assistant", content: botReply }]);

      speakText(botReply, currentLang);
    } catch (err) {
      console.error(err);
      speakText("Something went wrong.", LANGUAGES.english);
    }
  };

  const startBot = () => {
    setActive(true);
    speakText("Hello! I am ready to chat.");
    setTimeout(() => startRecognition(currentLang), 500);
  };

  return (
    <div className="voice-container">

      {/* ORB */}
      <div
        className={`voice-orb ${speaking ? "active" : listeningEffect ? "active" : "passive"}`}
      ></div>

      {/* STATUS BOX */}
      <div className="voice-status">
        {active ? (
          <p>{listeningEffect ? "🎤 Listening..." : "💬 Speak something..."}</p>
        ) : (
          <>
            <p style={{ color: "#bbb" }}>Press the button below to start</p>
            <button className="voice-start-btn" onClick={startBot}>
              Start Chat
            </button>
          </>
        )}

        {lastMessage && (
          <p className="voice-lastmsg">
            You said: <i>“{lastMessage}”</i>
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceChatBot;
