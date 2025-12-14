// Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Tesseract from "tesseract.js";
import { FaMicrophone, FaPaperPlane, FaUpload } from "react-icons/fa";
import VoiceChatBot from "./VoiceChatBot"; // adjust path if needed
import { FaRobot } from "react-icons/fa";
import PaymentForm from './PaymentForm'; // ✅ add PaymentForm

/* -------------------------
   (Your suggestionsList + other constants)
-------------------------*/
const suggestionsList = [
  "Hi 👍",
  "I Need Visit Visa?",
  "How are you?",
  "How To Cancel appointment",
];




const Chatbot = () => {
  /* -------------------------
     Existing chat states
  -------------------------*/
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! I am your chatbot. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [loadingNewChat, setLoadingNewChat] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [botTyping, setBotTyping] = useState(false);
  const [listening, setListening] = useState(false);
const [uploading, setUploading] = React.useState(false);
const [isUploading, setIsUploading] = useState(false);




const priceType = "Inside"; // or "Outside"



  // services
  const [services, setServices] = useState([]);

  const [showVoiceBot, setShowVoiceBot] = useState(false);

const cleanVisaDate = (value = "") => {
  let v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Fix common OCR mistakes
  v = v
    .replace(/^OA/, "")     // OASEP → SEP
    .replace(/^0A/, "")
    .replace(/^O/, "")
    .replace(/SEPT/, "SEP")
    .replace(/JNA/, "JAN")
    .replace(/FE8/, "FEB")
    .replace(/MARH/, "MAR")
    .replace(/APRl/, "APR")
    .replace(/JU1/, "JUL");

  // Match formats like SEP2012 / 09APR2012
  if (/^[A-Z]{3}\d{4}$/.test(v)) return v;
  if (/^\d{2}[A-Z]{3}\d{4}$/.test(v)) return v;

  return value; // fallback
};

  
  // upload/required doc states (existing)
  const [uploadRequestForService, setUploadRequestForService] = useState(null);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // { file, previewUrl }

  const messagesEndRef = useRef(null);
  const handleSubmit = () => {
    console.log("User input:", input);
    // Do whatever you need with the input
  };
  /* -------------------------
     NEW: reader (OCR) states
  -------------------------*/
  const [passportImage, setPassportImage] = useState(null); // preview URL
  const [passportData, setPassportData] = useState(null); // parsed JSON from OpenAI
  const [readerLoading, setReaderLoading] = useState(false);
  const [revealedFields, setRevealedFields] = useState([]); // animated reveal
  const [readerModalVisible, setReaderModalVisible] = useState(false);
  const [search, setSearch] = useState("");

    const [hover, setHover] = useState(false);

const [uploadModal, setUploadModal] = useState({
  visible: false,
  status: "waiting", // waiting|success|error
  fileName: "",
  docType: "",
});

  /* -------------------------
     Load services.json
  -------------------------*/
  useEffect(() => {
fetch("/services.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setServices(data);
        else if (Array.isArray(data.services)) setServices(data.services);
        else setServices([]);
      })
      .catch((err) => {
        console.error("Failed to load /services.json", err);
        setServices([]);
      });
  }, []);

  /* -------------------------
     Scrolling
  -------------------------*/
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping, uploadedFiles, readerModalVisible]);

  /* -------------------------
     Speech recognition (kept)
  -------------------------*/
  const recognitionRef = useRef(null);
  useEffect(() => {
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
      };
      recognition.onerror = (err) => {
        console.error("Speech error: ", err);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("SpeechRecognition init failed:", e);
    }
  }, []);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported on this browser.");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert("Microphone access denied!");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (error) {
        console.error("Error starting speech:", error);
      }
    }
  };

  /* -------------------------
     Helper: triggerBotResponse (kept but API key placeholder)
  -------------------------*/
  const triggerBotResponse = async (userMessage, silent = false) => {
    try {
      if (!silent) setBotTyping(true);

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: "",
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "system",
              content: "You are a UAE service assistant. If the user needs a service, call the function show_upload_form.",
            },
            { role: "user", content: userMessage },
          ],
          tools: [
            {
              type: "function",
              name: "show_upload_form",
              description: "Ask the user to upload required documents.",
              parameters: {
                type: "object",
                properties: {
                  serviceName: { type: "string" },
                  requiredDocs: { type: "array", items: { type: "string" } },
                  price: { type: "string" },
                },
                required: ["serviceName", "requiredDocs"],
              },
            },
          ],
        }),
      });

      const data = await response.json();
      const output = data.output?.[0];

      // function call (existing behavior)
      if (output?.type === "function_call") {
        const args = JSON.parse(output.arguments);
        setUploadRequestForService({ serviceName: args.serviceName });
        setRequiredDocs(args.requiredDocs);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `Please upload the required documents for ${args.serviceName}.` },
          ...args.requiredDocs.map((d) => ({ role: "bot", content: `• ${d}` })),
        ]);
        setBotTyping(false);
        return;
      }



      
// normal reply with typewriter effect
// normal reply with typewriter effect
let botReply = "I'm not sure what you mean.";
if (Array.isArray(output?.content)) {
  botReply = output.content.map((c) => c.text || "").join(" ");
}

if (!silent) {
  // add bot message with empty content for typing
  setMessages((prev) => [
    ...prev,
    { role: "bot", content: "", fullContent: botReply, typing: true } // store full content and typing flag
  ]);
  setBotTyping(true);

  // typewriter effect with random speed for natural typing
  let i = 0;
  const typingInterval = setInterval(() => {
    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === prev.length - 1 // last bot message
          ? { ...m, content: botReply.slice(0, i + 1) }
          : m
      )
    );
    i++;

    if (i >= botReply.length) {
      clearInterval(typingInterval);
      // remove typing flag after done
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === prev.length - 1 ? { ...m, typing: false } : m
        )
      );
      setBotTyping(false);
    }
  }, Math.floor(Math.random() * 10) + 30); // random typing speed 20-80ms per char
}

return botReply;
} catch (e) {
  console.error(e);
  if (!silent) {
    setMessages((prev) => [
      ...prev,
      { role: "bot", content: "Oops — something went wrong.", typing: false }
    ]);
    setBotTyping(false);
  }
}
}

  const sendMessage = async (msg = null) => {
    const userMessage = msg || input;
    if (!userMessage.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    await triggerBotResponse(userMessage);
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setUploadRequestForService(null);
    setRequiredDocs([]);
    setUploadedFiles([]);
  };

  const newChat = () => {
    setShowMenu(false);
    setLoadingNewChat(true);
    setTimeout(() => {
      setMessages([{ role: "bot", content: "Welcome to a new chat!" }]);
      setLoadingNewChat(false);
      setShowSuggestions(true);
      setUploadRequestForService(null);
      setRequiredDocs([]);
      setUploadedFiles([]);
    }, 1500);
  };

  /* -------------------------
     Upload/dropzone + OCR integration
  -------------------------*/
  // Upload modal state (existing)
const resizeImageIfNeeded = (file, maxWidth = 1200) => {
  return new Promise((resolve) => {
    // if not an image or small file, return original file
    if (!file.type.startsWith("image/")) return resolve(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        // if image width <= maxWidth, no resize needed
        if (img.width <= maxWidth) return resolve(file);

        const scale = maxWidth / img.width;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const newFile = new File([blob], file.name, { type: file.type });
            resolve(newFile);
          },
          file.type || "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

useEffect(() => {
  if (messages.length === 0) return;

  const last = messages[messages.length - 1];

  // Play sound ONLY for new bot messages
  if (last.role === "bot" && !last.playedSound) {
    const beep = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
    beep.play().catch(() => {});
    last.playedSound = true;
  }
}, [messages]);

const scanImageWithOCR = async (file, previewUrl) => {
  try {
    setReaderLoading(true);
    setPassportImage(previewUrl);
    setPassportData(null);
    setRevealedFields([]);
    setReaderModalVisible(false);

    // Resize image if needed
    let ocrInputUrl = previewUrl;
    try {
      const resizedFile = await resizeImageIfNeeded(file, 1200);
      if (resizedFile && resizedFile !== file) {
        ocrInputUrl = URL.createObjectURL(resizedFile);
      }
    } catch (resizeErr) {
      console.warn("Image resize failed:", resizeErr);
    }

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(ocrInputUrl, "eng");

    // Parse with OpenAI
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
          Authorization: "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Extract document type (Passport, Visa, Emirates ID, Car Registration) and all info as JSON. Text: """${text}"""`,
      }),
    });

  const data = await resp.json();
  let extractedText = data.output?.[0]?.content?.[0]?.text || "";
  extractedText = extractedText.replace(/```json|```/g, "").trim();

  // Helper to reveal fields with animation
  const revealFields = (fields) => {
    Object.keys(fields).forEach((key, idx) => {
      setTimeout(() => {
        setRevealedFields((prev) => [...prev, { label: key, value: fields[key] }]);
      }, idx * 80);
    });
  };

  let parsedData = {};
  try {
    parsedData = JSON.parse(extractedText);
  } catch {
    parsedData = { rawText: extractedText };
  }

  // AUTO-DETECT DOCUMENT TYPE
  const lowerText = extractedText.toLowerCase();
  if (!parsedData.DocumentType) {
    if (parsedData.VisaNumber || lowerText.includes("visa") || lowerText.includes("v<")) {
      parsedData.DocumentType = "Visa";
    } else if (parsedData.EmiratesID || lowerText.includes("emirates id")) {
      parsedData.DocumentType = "Emirates ID";
    } else if (parsedData.VehicleNumber || lowerText.includes("vehicle")) {
      parsedData.DocumentType = "Car Registration";
    } else if (lowerText.includes("passport") || extractedText.includes("P<")) {
      parsedData.DocumentType = "Passport";
    } else {
      parsedData.DocumentType = "Unknown";
    }
  }

  // Validate document type
  const validTypes = ["passport", "visa", "emirates id", "car registration"];
  const normalize = (str) => str.replace(/[^a-z]/g, "");
  const docTypeRaw = (parsedData.DocumentType || "").toLowerCase().trim();
  const isValidDocType = validTypes.some((t) => normalize(t) === normalize(docTypeRaw));

  // Helper to finalize and display parsed data
  const finalizeParse = () => {
    setPassportData(parsedData);
    revealFields(parsedData);
    setReaderModalVisible(true);
    setUploadedFiles([{ file, previewUrl }]);
    return true;
  };

  if (isValidDocType) {
    return finalizeParse();
  }

  // Fallback: check MRZ manually for passports/visas
  if (extractedText.includes("P<") || extractedText.includes("V<") || lowerText.includes("visa")) {
    parsedData.DocumentType = extractedText.includes("P<") ? "Passport" : "Visa";
    return finalizeParse();
  }

  // If all fails, show error
  setPassportData(null);
  setRevealedFields([]);
  setReaderModalVisible(false);
  setUploadModal({
    visible: true,
    status: "error",
    fileName: file.name,
    docType: "",
  });
  return false;

} catch (err) {
  console.error(err);
  setPassportData(null);
  setRevealedFields([]);
  setReaderModalVisible(false);
  setUploadModal({
    visible: true,
    status: "error",
    fileName: file.name,
    docType: "",
  });
  return false;
} finally {
  setReaderLoading(false);
}}


// onDrop: keep all original logic but now respects scanImageWithOCR's boolean return
const onDrop = async (acceptedFiles) => {
  const file = acceptedFiles[0];
  if (!file) return;

  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
  const fileObject = { file, previewUrl };

  // Add to uploadedFiles (original behavior)
  setUploadedFiles((prev) => [...prev, fileObject]);

  // Initially show waiting modal (original behavior)
  setUploadModal({ visible: true, status: "waiting", fileName: file.name, docType: "" });

  // Run OCR + parse (keeps original flow, but scanImageWithOCR now may use resized image internally)
  if (previewUrl) {
    const isValidDoc = await scanImageWithOCR(file, previewUrl); // <- returns true/false
    if (!isValidDoc) return; // stop here if invalid (keeps original behavior)
  }

  // Only upload to Uploadcare if document is valid (original behavior)
  try {
    const formData = new FormData();
    formData.append("UPLOADCARE_PUB_KEY", "062b9548e5a27a37f8ef");
    formData.append("UPLOADCARE_STORE", "1");
    formData.append("file", file);

    const uploadResp = await fetch("https://upload.uploadcare.com/base/", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadResp.json();

    if (uploadData.file) {
      setUploadModal({
        visible: true,
        status: "success",
        fileName: file.name,
        docType: uploadData.original_filename || "",
      });
    } else {
      setUploadModal({ visible: true, status: "error", fileName: file.name, docType: "" });
    }
  } catch (err) {
    console.error("Uploadcare upload failed:", err);
    setUploadModal({ visible: true, status: "error", fileName: file.name, docType: "" });
  }
};


  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // helper: copy field
  const copyToClipboard = (value) => navigator.clipboard.writeText(value || "");

  // filtered fields for search
  const filteredFields = revealedFields.filter((f) => f.label.toLowerCase().includes(search.toLowerCase()));

  /* -------------------------
     UI: same chat UI, plus integrated reader modal
  -------------------------*/
  return (
    <div style={{
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100%",
  backgroundColor: "#f5f6fa",
  fontFamily: "'Inter', sans-serif"
}}>
  {/* Header */}
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.5rem",
    backgroundColor: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    borderBottom: "1px solid #e0e0e0",
    zIndex: 5,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712086.png" alt="Bot" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
      <h2 style={{ margin: 0, color: "#222", fontWeight: 600, fontSize: "1.2rem" }}>GPT Chatbot</h2>
    </div>
    <div style={{ position: 'relative' }}>
      <div
        style={{ fontSize: '1.5rem', fontWeight: 'bolder', padding: "8px", color: '#333', cursor: 'pointer' }}
        onClick={() => setShowMenu(!showMenu)}
      >
        ⋮
      </div>
      {showMenu && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '2.6rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          <div onClick={newChat} style={{ padding: '0.5rem 1.2rem', cursor: 'pointer', color: '#007bff', borderBottom: '1px solid #f0f0f0', fontWeight: 500 }}>New Chat</div>
          <div onClick={clearChat} style={{ padding: '0.5rem 1.2rem', cursor: 'pointer', color: '#dc3545', fontWeight: 500 }}>Clear Chat</div>
        </div>
      )}
    </div>
  </div>

  {/* Messages */}
  <div style={{
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    backgroundColor: "#f5f6fa",
  }}>
    {messages.map((msg, idx) => (
      <div key={idx} style={{
        display: 'flex',
        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '0.6rem',
      }}>
        <img
          src={
            msg.role === 'user'
              ? "https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/man-user-circle-icon.png"
              : "https://uxwing.com/wp-content/themes/uxwing/download/internet-network-technology/robot-bot-outline-icon.png"
          }
          alt={msg.role}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            animation: msg.role === 'bot' && msg.typing ? 'float 2s ease-in-out infinite' : 'none',
          }}
        />

        <div style={{
          maxWidth: '75%',
          padding: '0.8rem 1.2rem',
          borderRadius: '18px',
          background: msg.role === 'user' ? '#0c9620ff' : '#fff',
          color: msg.role === 'user' ? '#fff' : '#333',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          wordBreak: 'break-word',
          position: 'relative',
          fontSize: '0.95rem'
        }}>
          {msg.content}

          {/* Typing animation */}
          {msg.role === 'bot' && msg.typing && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <span className="bounce-dot"></span>
              <span className="bounce-dot"></span>
              <span className="bounce-dot"></span>
            </div>
          )}
        </div>
      </div>
    ))}

    <div ref={messagesEndRef} />
  </div>


      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span className="bounce-dot"></span>
          <span className="bounce-dot"></span>
          <span className="bounce-dot"></span>
        </div>
      </div>

  <div ref={messagesEndRef} />

{uploadRequestForService && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    borderRadius: '15px',
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 9999
  }}>
    <div style={{
      width: "100%",
      maxWidth: "800px",
      background: "#fff",
      borderRadius: "20px",
      boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
      padding: "35px",
      display: "flex",
      flexDirection: "column",
      gap: "30px",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #eee",
        paddingBottom: "10px"
      }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#1a1a1a"
        }}>
          Upload Documents for {uploadRequestForService.serviceName}
        </h2>
        <button onClick={() => {
          setUploadRequestForService(null);
          setRequiredDocs([]);
          setUploadedFiles([]);
          setUploadModal({ visible: false, status: "waiting", fileName: "", docType: "" });
          setPassportImage(null);
          setPassportData(null);
          setReaderModalVisible(false);
        }} style={{
          fontSize: "24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#999",
          transition: "0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#ff4c4c"}
        onMouseLeave={e => e.currentTarget.style.color = "#999"}
        >✕</button>
      </div>

      {/* Required Documents + Dropzone */}
      <div style={{
        borderRadius: "16px",
        background: "#fdfdfd",
        border: "1px solid #ddd",
        padding: "25px",
        display: "flex",
        flexDirection: "column",
        gap: "25px",
      }}>
        {/* Required Documents */}
        <div style={{
          background: "linear-gradient(90deg, #f68a1e, #ffb347)",
          color: "#fff",
          padding: "14px 16px",
          borderRadius: "12px",
          fontWeight: 700,
          fontSize: "18px",
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
        }}>
          Required Documents
        </div>
        <ul style={{
          padding: "12px 30px",
          listStyleType: "decimal",
          fontSize: "16px",
          color: "#333",
          lineHeight: 1.6,
          background: "#f5efe8ff",
          borderRadius: "10px",
          border: "1px solid #f0e6dd",
        }}>
          {(requiredDocs.length ? requiredDocs : ["Passport Copy", "Passport-sized Photograph", "Proof of Residence"]).map((doc, i) => (
            <li key={i} style={{ marginBottom: "6px" }}>{doc}</li>
          ))}
        </ul>

<div
  {...getRootProps()}
  onDragEnter={() => setIsUploading(true)}
  onDragLeave={() => setIsUploading(false)}
  style={{
    border: isUploading ? "2px dashed #549ad4ff" : "2px dashed #f68a1e",
    borderRadius: "12px",
    padding: "35px",
    textAlign: "center",
    background: "#fff",
    cursor: "pointer",
    transition: "0.3s ease",
    color: "#f68a1e",
    boxShadow: isUploading
      ? "0 0 15px rgba(54, 141, 196, 0.4)"
      : "inset 0 0 10px rgba(246,138,30,0.1)",
    transform: isUploading ? "scale(1.05)" : "scale(1)",
  }}
>
  <input {...getInputProps()} />

  <FaUpload
    style={{
      fontSize: "30px",
      marginBottom: "10px",
      animation: isUploading ? "bounce 0.7s infinite" : "none",
      transition: "0.2s",
    }}
  />

  <p style={{ fontSize: "16px", fontWeight: 600 }}>Drag & drop files here</p>
  <p style={{ fontSize: "14px", color: "#999" }}>or click to browse</p>
</div>


        {/* Uploaded Files */}
        {uploadedFiles?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
            {uploadedFiles.map((fileObj, idx) => (
              <div key={idx} style={{
                position: "relative",
                width: "90px",
                height: "90px",
                borderRadius: "12px",
                background: "#fff7f0",
                border: "1px solid #f0e6dd",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "6px",
                color: "#333",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
              }}>
                <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#ff4c4c",
                  color: "#fff",
                  border: "none",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontWeight: 700,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>×</button>

                {fileObj.previewUrl ? (
                  <img src={fileObj.previewUrl} style={{
                    maxWidth: "80%",
                    maxHeight: "50%",
                    borderRadius: "6px"
                  }} />
                ) : (
                  <FaUpload style={{ fontSize: "18px", color: "#f68a1e" }} />
                )}

                <span style={{ fontSize: "11px", marginTop: "4px" }}>
                  {fileObj.file.name.length > 10 ? fileObj.file.name.slice(0, 10) + "..." : fileObj.file.name}
                </span>
                <span style={{ fontSize: "10px", color: "#777" }}>
                  {(fileObj.file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSubmit} style={{
            background: "linear-gradient(90deg, #f68a1e, #ffb347)",
            border: "none",
            padding: "12px 40px",
            borderRadius: "10px",
            fontSize: "16px",
            color: "#fff",
            cursor: "pointer",
            transition: "0.3s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
          onMouseLeave={e => e.currentTarget.style.opacity = 1}
          >
            SUBMIT
          </button>
        </div>
        </div>



{/* Upload modal (status overlay) */}
{uploadModal.visible && (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    display: "flex",
        borderRadius: '15px',

    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    backdropFilter: "blur(3px)"
  }}>
    
  <div style={{
  backgroundColor: "#131313ff",
  borderRadius: "24px",
  width: "90%",
  maxWidth: "450px",
  padding: "35px 25px",
  color: "#ecf0f1",
  textAlign: "center",
  boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  animation: "fadeIn 0.3s ease",
  position: "relative", // <-- ADD THIS
}}>
  {/* Waiting / Uploading */}
{uploadModal.status === "waiting" && (
  <>
    {/* Close button */}
    <button
      onClick={() =>
        setUploadModal({ visible: false, status: "waiting", fileName: "", docType: "" })
      }
      style={{
        position: "absolute",
        top: "12px",
        right: "16px",
        background: "transparent",
        border: "none",
        color: "#fff",
        fontSize: "24px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#ff4c4c")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#fff")}
    >
      ✕
    </button>

    {/* Animated Bot Logo */}
    <div
      style={{
        width: "80px",
        height: "80px",
        margin: "0 auto",
        borderRadius: "50%",
        background: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.1)",
        animation: "botBounce 1s infinite",
      }}
    >
      <img
        src="https://uxwing.com/wp-content/themes/uxwing/download/internet-network-technology/robot-bot-outline-icon.png"
        alt="Bot"
        style={{ width: "48px", height: "48px" }}
      />
    </div>

    <h2 style={{ fontWeight: 700, fontSize: "20px", marginTop: "10px" }}>
      Scanning and uploading
      <span style={{ display: "inline-block", marginLeft: "5px" }}>
        <span className="dots">...</span>
      </span>
    </h2>
    <p style={{ color: "#bdc3c7", fontSize: "14px", wordBreak: "break-all" }}>
      {uploadModal.fileName}
    </p>

    {/* CSS Animations */}
    <style>
      {`
        @keyframes botBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .dots::after {
          content: '';
          animation: dots 1s steps(5, end) infinite;
        }

        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
      `}
    </style>
  </>
)}

{/* Success */}
{uploadModal.status === "success" && (
  <>
    <div
      style={{
        width: "80px",
        height: "80px",
        margin: "0 auto",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #4cd137, #00a8ff)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        fontSize: "32px",
        fontWeight: "700",
        boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
        animation: "bounceIn 0.6s ease forwards", // <-- added animation
      }}
    >
      ✓
    </div>
    <h2
      style={{
        fontWeight: 700,
        fontSize: "20px",
        marginTop: "10px",
        animation: "fadeInUp 0.6s ease forwards", // <-- added animation
      }}
    >
      Upload Successful 🎉
    </h2>
    <p
      style={{
        color: "#bdc3c7",
        fontSize: "14px",
        animation: "fadeInUp 0.7s ease forwards", // <-- added animation
      }}
    >
      Your document has been successfully uploaded.
    </p>
    <button
      onClick={() =>
        setUploadModal({ visible: false, status: "waiting", fileName: "", docType: "" })
      }
      style={{
        marginTop: "15px",
        background: "linear-gradient(90deg, #f68a1e, #ffb347)",
        color: "#fff",
        border: "none",
        padding: "10px 30px",
        borderRadius: "8px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "0.3s",
        animation: "fadeInUp 0.8s ease forwards", // <-- added animation
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.85)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
    >
      Close
    </button>

    {/* Add animations keyframes */}
    <style>
      {`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}
    </style>
  </>
)}


    {/* Error */}
{uploadModal.status === "error" && (
  <>
    {/* Error Icon */}
    <div
      style={{
        width: "80px",
        height: "80px",
        margin: "0 auto",
        borderRadius: "50%",
        background: "#ffe5e5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e74c3c",
        fontSize: "36px",
        fontWeight: 700,
        transition: "0.3s",
      }}
    >
      ✕
    </div>

 {/* Title */}
<h2
  style={{
    color: "#e74c3c",
    fontWeight: 700,
    fontSize: "22px",
    textAlign: "center",
    marginTop: "12px",
  }}
>
  Scanning Failed
</h2>


    {/* Message */}
    <p
      style={{
        color: "#555",
        fontSize: "14px",
        textAlign: "center",
        marginTop: "6px",
        maxWidth: "280px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      There was an issue processing your file. Please check the file format and try again.
    </p>

    {/* Retry Button */}
    <button
      onClick={() =>
        setUploadModal({ visible: false, status: "waiting", fileName: "", docType: "" })
      }
      style={{
        marginTop: "20px",
        backgroundColor: "#e74c3c",
        color: "#fff",
        border: "none",
        padding: "12px 36px",
        borderRadius: "25px",
        fontWeight: 600,
        fontSize: "15px",
        cursor: "pointer",
        textTransform: "uppercase",
        transition: "0.3s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ff6b6b")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#e74c3c")}
    >
      Try Again
    </button>
  </>
)}

    </div>
  </div>
)}

         {/* Reader modal (shows OCR+parsed fields) */}
{readerModalVisible && passportData && uploadedFiles?.length > 0 && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 12000,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "rgba(33, 33, 33, 0.75)",
      backdropFilter: "blur(10px)",
      padding: 20,
    }}
    onClick={() => setReaderModalVisible(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="modal-container"
      style={{
        width: "98%",
        height: "95%",
        background: "#fff",
        borderRadius: 20,
        display: "flex",
        gap: 24,
        position: "relative",
        overflow: "hidden",
        padding: 24,
        flexDirection: "row",
      }}
    >
      {/* Close Button */}
      <button
        onClick={() => setReaderModalVisible(false)}
        style={{
          position: "absolute",
          top: 20,
          right: 45,
          fontSize: 24,
          color: "#000",
          border: "none",
          borderRadius: 12,
          width: 30,
          height: 30,
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          background: "transparent",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.background = "#ff5c5c";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#000";
          e.currentTarget.style.background = "transparent";
        }}
      >
        ✕
      </button>

      {/* Left Section */}
      <div
        className="modal-left"
        style={{
          flex: "0 0 380px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          gap: 12,
        }}
      >
      {/* Image + Search */}
{passportImage && (
  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
    <img
      src={passportImage}
      alt="preview"
      style={{ width: "100%", display: "block", borderRadius: 12 }}
    />

    {/* Modern Search Input */}
    <div style={{ position: "relative", marginTop: 16 }}>
      <input
        type="text"
        placeholder="Search fields..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 40px 12px 16px",
          borderRadius: 12,
          border: "1px solid #ccc",
          outline: "none",
          fontSize: 14,
          color: "#333",
          background: "#f9f9f9",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}
        onFocus={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)")}
        onBlur={(e) => (e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)")}
      />

    </div>

    {/* Description Overlay */}
    {passportData?.Description && (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          padding: "10px",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        {passportData.Description}
      </div>
    )}
  </div>
)}


        {/* Privacy Section */}
        <div
          style={{
            flex: 1,
            width: "100%",
            background: "rgba(42,42,42,0.96)",
            borderRadius: 12,
            padding: 16,
            color: "#ccc",
            fontSize: 13,
            lineHeight: 1.5,
            textAlign: "justify",
            overflowY: "auto",
          }}
        >
    <div style={{
  background: "#fff9f4",
  padding: "20px 25px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  maxWidth: "600px",
  margin: "20px auto",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  color: "#333"
}}>


  {/* Privacy & Data Policy */}
  <h4 style={{
    marginBottom: "12px",
    color: "#eb6b02",
    fontWeight: 600,
    fontSize: "18px",
  }}>
    Privacy & Data Policy
  </h4>
  
  <p style={{ marginBottom: "10px", lineHeight: 1.6 }}>
    Our AI-powered document preview helps users securely view and manage passport, visa, and ID information.
  </p>
  <p style={{ marginBottom: "10px", lineHeight: 1.6 }}>
    By using this service, your data will be used solely for document preview and analysis. Sensitive information is never stored externally without authorization.
  </p>
  <p style={{ marginBottom: "10px", lineHeight: 1.6 }}>
    Please upload only legally permitted documents. We use encryption and best practices to ensure privacy.
  </p>
  <p style={{ marginBottom: "0", lineHeight: 1.6 }}>
    For questions or support, our team is available to assist.
  </p>
</div>

        </div>
      </div>

      {/* Right Section */}
      <div
        className="modal-right"
        style={{
          flex: 1,
          minWidth: 0,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 20,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            width: "60%",
            margin: "0 auto 20px",
            padding: "50px 0",
            textAlign: "center",
            borderRadius: 16,
            background: "linear-gradient(135deg, #0d6efd, #1e90ff)",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22 }}>{passportData?.DocumentType || "Document Details"}</h2>
        </div>

        {/* Extracted Fields */}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d6efd", borderLeft: "4px solid #0d6efd", paddingLeft: 8, marginBottom: 12 }}>
          Extracted Fields
        </h3>
        <div className="fields-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {Object.entries(passportData)
            .filter(([key]) => key.toLowerCase().includes(search.toLowerCase()))
            .map(([key, value], idx) => (
              key !== "FaceImage" && (
                <div key={idx} style={{ background: "#f7f7f7", borderRadius: 8, padding: 10 }}>
                  <strong style={{ fontSize: 12, color: "#555", marginBottom: 4, display: "block" }}>{key}</strong>
                  <span style={{ fontSize: 14, color: "#000" }}>
                    {typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : value}
                  </span>
                </div>
              )
            ))}
        </div>

{/* Action Buttons */}
<div
  style={{
    marginTop: 16,
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  }}
>
  {/* Modern Upload Button */}
  <button
    onClick={async () => {
      setUploading(true);
      const fileObj = uploadedFiles[0];
      if (!fileObj) return;

      const formData = new FormData();
      formData.append("UPLOADCARE_PUB_KEY", "062b9548e5a27a37f8ef");
      formData.append("UPLOADCARE_STORE", "1");
      formData.append("file", fileObj.file);

      try {
        const uploadResp = await fetch("https://upload.uploadcare.com/base/", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResp.json();
        setUploadModal({
          visible: true,
          status: uploadData.file ? "success" : "error",
          fileName: fileObj.file.name,
          docType: uploadData.file ? fileObj.file.type : "",
        });
        if (uploadData.file) setReaderModalVisible(false);
      } catch (err) {
        console.error(err);
        setUploadModal({
          visible: true,
          status: "error",
          fileName: fileObj.file.name,
          docType: "",
        });
      } finally {
        setUploading(false);
      }
    }}
    disabled={uploading}
    style={{
      padding: "14px 42px",
      borderRadius: "24px",
      background: "linear-gradient(135deg, #f68a1e, #ffb347)",
      color: "#fff",
      border: "none",
      fontWeight: 600,
      fontSize: "16px",
      cursor: uploading ? "wait" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backdropFilter: "blur(6px)",
      boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
      transition: "all 0.3s ease",
    }}
    onMouseEnter={(e) => {
      if (!uploading) {
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)";
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.25)";
    }}
  >
    {uploading ? (
      <>
        <span
          style={{
            display: "inline-block",
            width: 18,
            height: 18,
            border: "3px solid #fff",
            borderTop: "3px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        Uploading...
      </>
    ) : (
      "Upload Now"
    )}
  </button>
</div>

{/* Pay Now / Payment Form */}
<div style={{   display: "flex", justifyContent: "center" }}>
  <PaymentForm />
</div>

{/* CSS Animations */}
<style>
{`
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`}
</style>





{/* Add this CSS in your global styles or styled component */}
<style>
  {`
    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 6px 20px rgba(30, 106, 246, 0.3); }
      50% { box-shadow: 0 12px 35px rgba(30, 106, 246, 0.6); }
    }
  `}
</style>



  {/* Spinner & Shine Animations + Responsive */}
  <style>
    {`
      @keyframes shine {
        0% { left: -100%; }
        50% { left: 100%; }
        100% { left: 100%; }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .modal-left { display: none !important; }
        .modal-right { padding: 16px; }
        .modal-header {
          width: 100% !important;
          border-radius: 0 !important;
          background: none !important;
          color: #000 !important;
        }
        .fields-grid { grid-template-columns: 1fr !important; } 
      }
    `}
  </style>
</div>
      </div>
    </div>
)}

          </div>
        </div>
      )}
     <button
        onClick={() => setShowVoiceBot(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '50px',
          height: '50px',
          border: "none",
          borderRadius: "50%", // circular button
          cursor: "pointer",
          fontSize: "28px",
          position: "absolute",
          bottom: "190px", // place above main button
          left: '15px',
          backgroundColor: "rgba(255, 255, 255, 1)",
          color: "#2e9ce0ff",
          padding: "6px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transition: "all 0.3s ease",
          transform: hover ? "scale(1.1)" : "scale(1)", // scale animation
        }}
      >
        <FaRobot />
      </button>
   {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "160px", // place above the button
            left: "8%",
            transform: "translateX(-50%)",
            backgroundColor: "#333",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            opacity: 0.9,
          }}
        >
          Voice Assistant
        </div>
      )}



      {/* Suggestions */}
      {showSuggestions && (
<div
  style={{
    display: window.innerWidth < 768 ? "none" : "flex", // hide on mobile
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    maxWidth: '100%',
  }}
>
  {suggestionsList.map((s, idx) => (
    <button
      key={idx}
      onClick={() => sendMessage(s)}
      style={{
        padding: '0.9rem 1.2rem',
        borderRadius: '50px',
        border: 'none',
        backgroundColor: '#f0f4ff',
        color: '#1a73e8',
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {s}
    </button>
  ))}
</div>

      )}
    <div>

      {/* Fullscreen VoiceChatBot */}
      {showVoiceBot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)", // semi-transparent dark overlay
            backdropFilter: "blur(8px)", // blur effect
            WebkitBackdropFilter: "blur(8px)", // Safari support
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowVoiceBot(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "#ff4c4c",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              cursor: "pointer",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            ✕
          </button>

          {/* Voice Chat Bot component */}
          <VoiceChatBot />
        </div>
      )}
    </div>



    
{/* Input Area */}
<div style={{
  display: 'flex',
  padding: '0.8rem 1rem',
  gap: '0.8rem',
  backgroundColor: '#fff',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  borderRadius: '20px',
  alignItems: 'center',
  margin: '0 1.5rem 1rem 1.5rem',
  position: 'sticky',
  bottom: 0,
  zIndex: 20,
}}>

  {/* Text Input */}
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    placeholder="Type a message..."
    style={{
      flex: 1,
      borderRadius: '50px',
      border: '1px solid #e0e0e0',
      padding: '0.85rem 1.2rem',
      outline: 'none',
      fontSize: '1rem',
      backgroundColor: '#f4f6f9',
      transition: 'all 0.2s ease-in-out',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
    }}
    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
  />

  {/* Voice Button */}
  <button
    onClick={toggleListening}
    style={{
      borderRadius: '50%',
      backgroundColor: listening ? '#ff6b6b' : '#6c757d',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      padding: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      transition: 'all 0.2s ease-in-out',
    }}
    title={listening ? "Stop Listening" : "Start Voice Input"}
  >
    <FaMicrophone />
  </button>

  {/* Send Button */}
  <button
    onClick={sendMessage}
    style={{
      borderRadius: '50px',
      background: 'linear-gradient(90deg, #0062ff, #00d4ff)',
      color: '#fff',
      border: 'none',
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'all 0.2s ease-in-out',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <FaPaperPlane />
  </button>

</div>


    </div>
  );
};

export default Chatbot;
// 