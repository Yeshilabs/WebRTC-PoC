'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSocket from '../../../hooks/useSocket';
import io, { type Socket } from 'socket.io-client';

// we want to be able to generate a proof and send that json over webRTC

const Room = () => {
    useSocket();
    const params = useParams();
    console.log("Room ID:", params!.id);
    const rtcConnectionRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<typeof Socket | null>(null); // Specify the type as `Socket | null`
    const userStreamRef = useRef<MediaStream | null>(null);
    const hostRef = useRef(false);
    const [roomName, setRoomName] = useState(params!.id);
    const pendingCandidates = useRef<RTCIceCandidate[]>([]);

    const handleRoomCreated = () => {
        console.log('Room created');
        hostRef.current = true;
    };

    const handleRoomJoined = () => {
        if (socketRef.current) {
            console.log('Room joined');
            socketRef.current!.emit('ready', roomName);
        } else {
            console.log('Peer connection is not created');
        }
    };

    const initiateCall = () => {
        if (hostRef.current) {
            console.log('Initiating call');
            rtcConnectionRef.current = createPeerConnection();       
            rtcConnectionRef.current
                .createOffer()
                .then((offer) => {
                    console.log("Offer created");
                    rtcConnectionRef.current!.setLocalDescription(offer);
                    socketRef.current!.emit('offer', offer, roomName);
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    };



    const ICE_SERVERS = {
        iceServers: [
            {
                urls: 'stun:openrelay.metered.ca:80',

            }
        ],
    };

    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    const createPeerConnection = () => {
        // We create a RTC Peer Connection
        const connection = new RTCPeerConnection(ICE_SERVERS);
        // if (hostRef.current) {
        //     console.log("Host connection created");
        //     connection.createOffer()
        // .then((offer) => {
        //     console.log("Offer created");
        //     rtcConnectionRef.current!.setLocalDescription(offer);
        //     socketRef.current!.emit('offer', offer, roomName);
        // })
        // .catch((error) => {
        //     console.log(error);
        // });
        // }
        
        // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
        connection.onicecandidate = handleICECandidateEvent;

        // Set up data channel for the host
        if (hostRef.current) {
            const dataChannel = connection.createDataChannel('jsonChannel');
            console.log("Data channel created");
            dataChannel.onopen = handleDataChannelOpen;
            dataChannel.onmessage = handleDataChannelMessage;
            dataChannel.onclose = handleDataChannelClose;
            dataChannelRef.current = dataChannel;
        } else {
            // Handle receiving a data channel for non-host
            connection.ondatachannel = (event) => {
                console.log("Data channel received");
                console.log("data channel event", event);
                dataChannelRef.current = event.channel;
                dataChannelRef.current.onopen = handleDataChannelOpen;
                dataChannelRef.current.onmessage = handleDataChannelMessage;
                dataChannelRef.current.onclose = handleDataChannelClose;
            };
            
        }

    return connection;
    }

    const handleDataChannelOpen = () => {
        console.log("Data channel is open and ready for data transmission");
    };

    const handleDataChannelMessage = (event: MessageEvent) => {
        const receivedData = JSON.parse(event.data);
        console.log("Received JSON data:", receivedData);
        // Handle the received JSON data here
    };

    const handleDataChannelClose = () => {
        console.log("Data channel is closed");
    };

    const handleICECandidateEvent = (event: any) => {
        if (!rtcConnectionRef.current) {
            console.log("Peer connection is not created");
            return;
        }
        if (event.candidate) {
            console.log("Sending ICE candidate", event.candidate);
            socketRef.current!.emit('ice-candidate', event.candidate, roomName);
        }
    };

    const onPeerLeave = () => {
        console.log('Peer left');
    };

    // const handleReceivedOffer = (offer: any) => {
    //     if (!hostRef.current) {

    //         rtcConnectionRef.current = createPeerConnection();
    //         rtcConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
    //             .then(() => {
    //                 console.log("Received offer");
    //                 // Process pending ICE candidates
    //                 pendingCandidates.current.forEach((candidate) => {
    //                     rtcConnectionRef.current!.addIceCandidate(candidate).catch((e) => console.log(e));
    //                 });
    //                 pendingCandidates.current = []; // Clear the queue
    //                 return rtcConnectionRef.current!.createAnswer();
    //             })
    //             .then((answer) => {
    //                 rtcConnectionRef.current!.setLocalDescription(answer);
    //                 socketRef.current!.emit('answer', answer, roomName);
    //             })
    //             .catch((error) => console.log('Error handling offer:', error));
    //     }
    // };
    const handleReceivedOffer = (offer:any) => {
        if (!hostRef.current) {
          rtcConnectionRef.current = createPeerConnection();
          rtcConnectionRef.current.setRemoteDescription(offer);
          console.log("Received offer"); 
          rtcConnectionRef.current
            .createAnswer()
            .then((answer) => {
                console.log("Answer created");
              rtcConnectionRef.current!.setLocalDescription(answer);
              socketRef.current!.emit('answer', answer, roomName);
            })
            .catch((error) => {
              console.log(error);
            });
        }
      };


      const handleAnswer = (answer:any) => {
        console.log("Received answer");
        rtcConnectionRef.current!
          .setRemoteDescription(answer)
          .catch((err) => console.log(err));
      };

    // const handlerNewIceCandidateMsg = (incoming: any) => {
    //     const candidate = new RTCIceCandidate(incoming);
    //     if (!rtcConnectionRef.current) {
    //         console.log("Peer connection is not created");
    //         return;
    //     }
    //     if (rtcConnectionRef.current && rtcConnectionRef.current.remoteDescription) {
    //         rtcConnectionRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
    //     } else {
    //         // Queue the candidate if remote description is not set yet
    //         console.log("Queuing ICE candidate");
    //         pendingCandidates.current.push(candidate);
    //     }
    // };

    const handlerNewIceCandidateMsg = (incoming:any) => {
        // We cast the incoming candidate to RTCIceCandidate
        const candidate = new RTCIceCandidate(incoming);
        rtcConnectionRef.current!
          .addIceCandidate(candidate)
          .catch((e) => console.log(e));
      };


    useEffect(() => {
        socketRef.current = io(); // Initialize the socket connection

        // First we join a room
        socketRef.current.emit('join', roomName);

        // Add event listeners with non-null assertion
        socketRef.current!.on('created', handleRoomCreated);
        socketRef.current!.on('joined', handleRoomJoined);
        socketRef.current!.on('ready', initiateCall);
        socketRef.current!.on('leave', onPeerLeave);
        socketRef.current!.on('full', () => {
            window.location.href = '/';
        });
        socketRef.current!.on('offer', handleReceivedOffer);
        socketRef.current!.on('answer', handleAnswer);
        socketRef.current!.on('ice-candidate', handlerNewIceCandidateMsg);

        // Clean up when the component unmounts
        return () => {
            socketRef.current?.disconnect(); // Use optional chaining to ensure safe cleanup
            socketRef.current = null;
        };
    }, [roomName]);

    const sendJSONData = (data: Record<string, any>) => {
        if (!dataChannelRef.current) {
            console.log("dataChannelRef is null");
            return;
        } else if (dataChannelRef.current.readyState != 'open') {
            console.log("dataChannelRef =! open");
            return;
        }

        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify(data));
        } else {
            console.log("Data channel is not open");
        }
    };




    // in the return statement we will have the json data that we want to send over.
    return (
        <div>
            <p>Hey</p>
            <button onClick={() => sendJSONData({ message: "Hello, peer!" })}>
                Send JSON Data
            </button>
        </div>
    );
};

export default Room;




