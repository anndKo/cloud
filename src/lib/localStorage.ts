export interface LocalBetRequest {
  id: string;
  betId: string;
  roomCode: string;
  betName: string;
  gameName: string;
  amount: number;
  billImageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  gameRoomCode?: string;
  refundSent?: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'game_bet_requests';

export function getLocalBets(): LocalBetRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalBet(bet: LocalBetRequest) {
  const bets = getLocalBets();
  bets.push(bet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}

export function updateLocalBetStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
  const bets = getLocalBets();
  const idx = bets.findIndex(b => b.id === id);
  if (idx !== -1) {
    bets[idx].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  }
}

export function updateLocalBetGameCode(id: string, gameRoomCode: string) {
  const bets = getLocalBets();
  const idx = bets.findIndex(b => b.id === id);
  if (idx !== -1) {
    bets[idx].gameRoomCode = gameRoomCode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  }
}

export function updateLocalBetRefundSent(id: string) {
  const bets = getLocalBets();
  const idx = bets.findIndex(b => b.id === id);
  if (idx !== -1) {
    bets[idx].refundSent = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  }
}
