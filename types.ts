export interface AppData {
    userData?: {
        access_token: string;
        expires_at: number;
        user: {
            id: string;
        }
    };
    userProfile?: {
        id: string;
        username: string;
        avatar_url: string;
    };
    lastWindowState?: { width: number; height: number };
}
