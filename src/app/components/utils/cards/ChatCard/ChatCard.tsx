'use client'
import Image from "next/image";
import style from "./ChatCard.module.css"
import { IoClose } from "react-icons/io5";
import ButtonOne, { ButtonFive, ButtonFour, ButtonTwo } from "../../Edit/buttons/Buttons";
import { BsSendFill } from "react-icons/bs";
import { InputTen } from "../../Edit/Input/Input";
import { useCallback, useEffect, useState, KeyboardEvent, useRef } from "react";
import Apis from "@/app/service/hooks/ApiSlugs";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAlert } from "@/app/redux/utils/message";
import {marked} from "marked"

const ChatCard = () => {
    const params = useParams()
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [Id, setId] = useState("");
    const [ChatData, setChatData] = useState<any>();
    const [videoUrl, setVideoUrl] = useState("");
    const [videoTime, setVideoTime] = useState(0);
    const [videoDetails, setVideoDetails] = useState("");
    const dispatch = useDispatch();
    const [chatMsg, setChatMsg] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const chatMsgHandler = (data: string) => {
        setChatMsg(data);
    }

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    const chatHandler = useCallback(async (notes_token: string) => {
        const apis = Apis();
        setLoading(true);
        const params = new URLSearchParams({ urlCode: notes_token } as any).toString();
        console.log("Fetching chat with params:", params);
        setVideoUrl(notes_token);
        
        try {
            const data = await apis.GetChat(params);
            if (data.status == 200) {
                setLoading(false);
                setChatData(data);
                
                if (data?.data?.video_time) {
                    setVideoTime(data.data.video_time);
                }
                if (data?.data?.video_details) {
                    setVideoDetails(data.data.video_details);
                }
                
                console.log("Chat data received:", data);
                // Scroll to the bottom after chat data is loaded
                setTimeout(scrollToBottom, 100);
            } else {
                setLoading(false);
                dispatch(setAlert({data:{message: data.message || "Failed to fetch chat", show: true, type: "error"}}));
            }
        } catch (error: any) {
            setLoading(false);
            dispatch(setAlert({ data: { message: error.message || "An error occurred", show: true, type: "error" } }));
        }
    }, [dispatch]);

    const sendMessage = async () => {
        if (!chatMsg.trim() || sending) return;
        
        const apis = Apis();
        setSending(true);
        
        try {
            const newUserMessage = {
                role: 'user',
                content: chatMsg
            };
            
            const updatedMessages = [
                ...(ChatData?.data?.chat?.messages || []),
                newUserMessage
            ];
            
            setChatData((prevData: any) => ({
                ...prevData,
                data: {
                    ...prevData?.data,
                    chat: {
                        ...prevData?.data?.chat,
                        messages: updatedMessages
                    }
                }
            }));
            
            // Scroll to bottom after adding user message
            setTimeout(scrollToBottom, 50);
            
            setChatMsg("");

            const response = await apis.SendChatMessage({
                video_url: videoUrl,
                video_time: videoTime || 3245,
                question: chatMsg,  
                video_details: videoDetails || "AI Research Paper on LLMs",
                tone: "Professional",
                language: "English",
                response_type: "Concise",
                model: "llama-3.1-8b-instant"
            });
            
            console.log("Message sent, response:", response);
            
            if (response.status === 200) {
                if (response.data?.answer) {
                    const aiMessage = {
                        role: 'ai',
                        content: response.data.answer
                    };
                    
                    setChatData((prevData: any) => ({
                        ...prevData,
                        data: {
                            ...prevData?.data,
                            chat: {
                                ...prevData?.data?.chat,
                                messages: [...updatedMessages, aiMessage]
                            }
                        }
                    }));
                    
                    // Scroll to bottom after adding AI response
                    setTimeout(scrollToBottom, 50);
                } else {
                    await chatHandler(Id);
                }
            } else {
                dispatch(setAlert({
                    data: {
                        message: response.message || "Failed to send message",
                        show: true,
                        type: "error"
                    }
                }));
                await chatHandler(Id);
            }
        } catch (error: any) {
            dispatch(setAlert({
                data: {
                    message: error.message || "An error occurred while sending message",
                    show: true,
                    type: "error"
                }
            }));
            await chatHandler(Id);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Effect to scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [ChatData?.data?.chat?.messages]);

    useEffect(() => {
        if (params?.id) {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            setId(id);
            chatHandler(id);
        } else {
            setLoading(false);
        }
    }, [params?.id, chatHandler]);

    return (
        <div className={style.main}>
            <div className={style.mainHeader}>
                <div className={style.mainHeaderImage}>
                    <Image src={"/images/logo.jpg"} alt="logo" width={30} height={30} style={{objectFit:"cover",borderRadius:"50%"}} />
                    <p>Glanceme.Ai</p>
                </div> 
            </div>
            <div className={style.mainCenter} ref={chatContainerRef}>
                {loading ? (
                    <div className={style.mainCenterItem}>
                        <div className={style.mainCenterItemLeft}>
                            <div className={style.mainCenterItemLeftItem}>Loading chat...</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {ChatData?.data?.summary?.[0]?.summary ? (
                            <div className={style.mainCenterItem}>
                                <div className={style.mainCenterItemLeft}>
                                    <div 
                                        className={style.mainCenterItemLeftItem} 
                                        dangerouslySetInnerHTML={{__html: marked.parse(ChatData?.data?.summary[0]?.summary)}}
                                    />
                                </div>
                            </div>
                        ) : ""}
                        
                        {ChatData?.data?.chat?.messages?.length > 0 ? 
                            ChatData?.data?.chat?.messages?.map((value: any, index: number) => (
                                <div key={`msg-${index}-${value.role}`} className={style.mainCenterItem}>
                                    {value?.role === 'ai' ? (
                                        <div className={style.mainCenterItemLeft}>
                                            <div 
                                                className={style.mainCenterItemLeftItem} 
                                                dangerouslySetInnerHTML={{__html: marked.parse(value?.content)}}
                                            />
                                        </div>
                                    ) : (
                                        <div className={style.mainCenterItemRight}>
                                            <p>{value?.content}</p>
                                        </div>
                                    )}
                                </div>
                            )) 
                        : ""}
                        
                        {sending && (
                            <div className={style.mainCenterItem}>
                                <div className={style.mainCenterItemLeft}>
                                    <div className={style.mainCenterItemLeftItem}>
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {!ChatData?.data?.summary?.[0]?.summary && 
                         !ChatData?.data?.chat?.messages?.length && 
                         !sending && 
                         <div className={style.noChat}>No Chat Found</div>}
                         
                         <div className={style.scrollAnchor} />
                    </>
                )}
            </div>
            <div className={style.mainFooter}>
                <div className={style.mainFooterInput}>
                    <InputTen 
                        placeholder={"Type a message..."} 
                        value={chatMsg} 
                        onChange={chatMsgHandler}
                        onKeyPress={handleKeyPress}
                        disabled={sending || loading}
                    />
                </div>
                <div 
                    className={style.mainFooterBtn}
                    onClick={sendMessage}
                >
                    <svg 
                        stroke="currentColor" 
                        fill="currentColor" 
                        strokeWidth="0" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M21.7267 2.95694L16.2734 22.0432C16.1225 22.5716 15.7979 22.5956 15.5563 22.1126L11 13L1.9229 9.36919C1.41322 9.16532 1.41953 8.86022 1.95695 8.68108L21.0432 2.31901C21.5716 2.14285 21.8747 2.43866 21.7267 2.95694ZM19.0353 5.09647L6.81221 9.17085L12.4488 11.4255L15.4895 17.5068L19.0353 5.09647Z"></path>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default ChatCard;