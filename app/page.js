"use client";
import { Box, Button, Stack, TextField, IconButton } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
//import MicIcon from "@mui/icons-material/Mic";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import NavBar from "@/component/Navbar"
import HomePage from "./homepage/page"
import Footer from "@/component/Footer";
import { SignedIn, SignedOut } from "@clerk/nextjs";



export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ]);

  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        } else {
          console.log("No valid messages found in local storage");
        }
      } catch (error) {
        console.error("Error parsing messages from local storage:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      //save if there are messages beyond the initial one
      try {
        localStorage.setItem("chatMessages", JSON.stringify(messages));
        console.log("Saved messages to local storage:", messages);
      } catch (error) {
        console.error("Error saving messages to local storage:", error);
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  //browser compatibility
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("Speech Recognition API not supported");
    return <div>Speech Recognition API not supported in this browser.</div>;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = false; // only listen for a single utterance
  recognition.interimResults = false; // don't return interim results
  recognition.lang = "en-US"; // language to US English

  recognition.onstart = () => {
    console.log("Speech recognition started");
    setIsListening(true);
  };

  // speech to text conversion
  recognition.onresult = (event) => {
    const speechToText = event.results[0][0].transcript;
    console.log("Speech to text result:", speechToText);
    setMessage(speechToText);
    setIsListening(false);
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    setIsListening(false);
  };

  recognition.onend = () => {
    console.log("Speech recognition ended");
    setIsListening(false);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognition.stop(); //stop listening if already active
    } else {
      recognition.start(); //start listening if inactive
    }
  };

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // if enter key is pressed without shift key, prevent default behavior, and send the message
      sendMessage();
    }
  };

  const clearChatHistory = () => {
    const initialMessage = {
      role: "assistant",
      content: `Chat history has been cleared. How can I help you today?`,
    };
    setMessages([initialMessage]);
    localStorage.removeItem("chatMessages");
  };

  const exportChat = () => {
    const fileName = "rmp_chat_history.txt"; //switch btw .json or .md 
    const fileContent = messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n\n"); //format as "role: content" with line breaks in between

    const blob = new Blob([fileContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div>
      <SignedIn>
        <NavBar></NavBar>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          bgcolor="#f5f5f5"
          p={1}
          height="83vh"
        >
          <Stack
            direction="column"
            width="600px"
            height="600px"
            borderRadius={5}
            boxShadow="0 8px 16px rgba(0, 0, 0, 0.1)"
            bgcolor="white"
            p={3}
            spacing={3}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
              height="2%"
            >
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={clearChatHistory}
              >
                Clear Chat History
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<SaveAltIcon />}
                onClick={exportChat}
                sx={{
                  borderRadius: "8px",
                  padding: "8px 16px",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                Export Chat
              </Button>
            </Stack>
            <Stack
              direction="column"
              spacing={2}
              flexGrow={1}
              overflow="auto"
              maxHeight="100%"
              sx={{
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#cccccc",
                  borderRadius: "10px",
                },
              }}
            >
              {messages.map((message, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent={
                    message.role === "assistant" ? "flex-start" : "flex-end"
                  }
                >
                  <Box
                    bgcolor={
                      message.role === "assistant"
                        ? "primary.main"
                        : "secondary.main"
                    }
                    color="white"
                    borderRadius="12px"
                    p={2}
                    maxWidth="75%"
                    boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
                    sx={{ padding: "25px" }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Type your message..."
                variant="outlined"
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                multiline
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
              />
              <IconButton
                onClick={handleVoiceInput}
                color={isListening ? "secondary" : "default"}
                sx={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}
              >
                <MicNoneRoundedIcon />
              </IconButton>
              <Button
                variant="contained"
                color="primary"
                onClick={sendMessage}
                disabled={!message.trim()}
                sx={{
                  borderRadius: "8px",
                  padding: "8px 16px",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                Send
              </Button>
            </Stack>
          </Stack>
        </Box>
        <Footer></Footer>
      </SignedIn>
      <SignedOut>
        <HomePage></HomePage>
      </SignedOut>
    </div>
  );
}
