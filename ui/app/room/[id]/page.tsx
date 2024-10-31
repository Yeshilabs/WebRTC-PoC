'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSocket from '../../../hooks/useSocket';
import io, { type Socket } from 'socket.io-client';

// we want to be able to generate a proof and send that json over webRTC

const Room = () => {
    useSocket();
    const params = useParams();
    console.log("Room ID:", params.id);
    const rtcConnectionRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<typeof Socket | null>(null); // Specify the type as `Socket | null`
    const userStreamRef = useRef<MediaStream | null>(null);
    const hostRef = useRef(false);
    const [roomName, setRoomName] = useState(params.id);

    const handleRoomCreated = () => {
        console.log('Room created');
        hostRef.current = true;
    };

    const handleRoomJoined = () => {
        console.log('Room joined');

    };

    const initiateCall = () => {
        // When is this function called ? 
    };

    const ICE_SERVERS = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302',
            }
        ],
    };

    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    const createPeerConnection = () => {
        // We create a RTC Peer Connection
        const connection = new RTCPeerConnection(ICE_SERVERS);

        // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
        connection.onicecandidate = handleICECandidateEvent;

        // We implement our onTrack method for when we receive tracks 
        //TOOD: what is a track ????
        connection.ontrack = handleTrackEvent;
        // Set up data channel for the host
        if (hostRef.current) {
            const dataChannel = connection.createDataChannel('jsonChannel');
            dataChannel.onopen = handleDataChannelOpen;
            dataChannel.onmessage = handleDataChannelMessage;
            dataChannel.onclose = handleDataChannelClose;
            dataChannelRef.current = dataChannel;
        } else {
            // Handle receiving a data channel for non-host
            connection.ondatachannel = (event) => {
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
        if (event.candidate) {
            socketRef.current!.emit('ice-candidate', event.candidate, roomName);
        }
    };

    const handleTrackEvent = (event: any) => {
        console.log('Track event');
        // TODO what's going on here?
    }

    const onPeerLeave = () => {
        console.log('Peer left');
    };

    const handleReceivedOffer = () => {
        console.log('Received offer');
    };

    const handleAnswer = () => {
        console.log('Received answer');
    };

    const handlerNewIceCandidateMsg = () => {
        console.log('New ICE candidate received');
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



