import { useRef, useEffect, useState } from "react";
import Message from "./Message";
import SendMessageForm from "./SendMessageForm";
import HeaderMd from "../global/HeaderMd";
import { useChatStore } from "../../store/chatStore";
import { useSocketStore } from "../../store/socketStore";
import SkeletonMessage from "./SkeletonMessage";
import { Navigate, useParams } from "react-router-dom";
import api from "../../utils/apiClient";
import { useChatSocket } from "../../hooks/useChatSocket";

const ChatInterface = () => {
  const messages = useChatStore((state) => state.messages);
  const streamingMessageId = useChatStore((state) => state.streamingMessageId);
  const setStreamingMessageId = useChatStore((state) => state.setStreamingMessageId);
  const isConnected = useSocketStore((state) => state.isConnected);
  const connectionStatus = useSocketStore((state) => state.connectionStatus);
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const { industryName, equipmentName } = useParams();
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const fetchEquipments = async () => {
      try {
        const response = await api.get(`/industry-equipment/check-equipment?industry=${industryName}&equipment=${equipmentName}`);
        setEquipment(response.data);
      } catch (err) {
        console.log("Failed to fetch equipment", err);
        setEquipment(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipments();
  }, [industryName, equipmentName]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set streaming for the last assistant message when it's added
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const parsedMessage = JSON.parse(lastMessage.content);
        if (parsedMessage.content.responseText !== "loading") {
          setStreamingMessageId(lastMessage.id || messages.length - 1);
        }
      }
    }
  }, [messages, setStreamingMessageId]);

  useChatSocket(equipment);

  if (!loading && !equipment) {
    return <Navigate to={"/404"} />;
  }
  return (
    <div className="w-full flex flex-col h-full border-r border-[#024544]/30">
      <HeaderMd />

      {!isConnected && connectionStatus == "disconnected" ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-4">
          Chat is currently unavailable. Please check your connection.
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {messages?.length > 0 ? (
              <>
                {messages.map((message, index) => {
                  const messageId = message.id || index;
                  const isStreaming = streamingMessageId === messageId;
                  return <Message key={messageId} message={message} isStreaming={isStreaming} />;
                })}
                {messages[messages.length - 1]?.role === "user" && <SkeletonMessage />}
              </>
            ) : (
              <SkeletonMessage />
            )}
            <div ref={chatScrollRef}></div>
          </div>
          <SendMessageForm equipment={equipment} />
        </>
      )}
    </div>
  );
};

export default ChatInterface;
