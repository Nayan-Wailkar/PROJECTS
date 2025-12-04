// Use single chats collection instead of user subcollections
export async function createAuctionChat({ auctionId, auctionData, farmerSession, buyerEmail, buyerName, finalPrice }) {
  const chatId = `auction_${auctionId}`;
  const chatRef = doc(db, 'chats', chatId);
  
  // Check if chat already exists
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    return chatId;
  }

  // Find buyer UID
  let buyerUid = await findUserUidByEmail(buyerEmail);
  
  const participants = [farmerSession.uid];
  if (buyerUid) participants.push(buyerUid);

  const chatDoc = {
    id: chatId,
    auctionId,
    title: auctionData.productName || 'Auction Chat',
    participants,
    participantInfo: {
      [farmerSession.uid]: {
        name: farmerSession.name,
        email: farmerSession.email,
        role: 'farmer'
      }
    },
    metadata: {
      farmerUid: farmerSession.uid,
      buyerUid: buyerUid,
      finalPrice,
      createdBy: farmerSession.uid
    },
    createdAt: serverTimestamp(),
    lastMessage: 'Auction completed! Discuss delivery details.',
    lastMessageTime: serverTimestamp(),
    status: 'active'
  };

  // Add buyer info if found
  if (buyerUid) {
    chatDoc.participantInfo[buyerUid] = {
      name: buyerName,
      email: buyerEmail,
      role: 'buyer'
    };
  }

  await setDoc(chatRef, chatDoc);
  
  // Add welcome message
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderUid: farmerSession.uid,
    senderName: farmerSession.name,
    content: `Congratulations! Your bid of ₹${finalPrice} was accepted for "${chatDoc.title}". Let's discuss delivery.`,
    timestamp: serverTimestamp(),
    type: 'system'
  });

  return chatId;
}

// Subscribe to user's chats from main chats collection
export function subscribeToUserChats(userUid, callback) {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userUid),
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(chats);
  });
}

// Send message to single chat collection
export async function sendChatMessage(chatId, messageData) {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (!chatSnap.exists()) {
    throw new Error('Chat not found');
  }

  const messagePayload = {
    senderUid: messageData.senderUid,
    senderName: messageData.senderName,
    senderRole: messageData.senderRole,
    content: messageData.content,
    timestamp: serverTimestamp(),
    type: messageData.type || 'text'
  };

  // Add message to shared messages collection
  await addDoc(collection(db, 'chats', chatId, 'messages'), messagePayload);

  // Update last message in chat
  await updateDoc(chatRef, {
    lastMessage: messageData.content,
    lastMessageTime: serverTimestamp(),
    lastMessageSender: messageData.senderName
  });

  return true;
}