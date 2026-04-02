# Feature: Social 🤝

Bingeki V2 introduces social features to turn solitary reading into a shared experience.

## Friends System
- **Search**: Users can search for others by exact DataBase property (email or username).
- **Requests**: Send/Accept/Decline flow stored in `users/{userId}/friendRequests`.
- **Friend List**: Reference array of user IDs.

## Activity Feed
A unified feed showing actions from all friends.
- **Implementation**: Listens to the `activities` collection where `userId` is in the current user's friend list.
- **Design (Manga Grid)**: The feed uses a dynamic grid layout inspired by manga panels. Highlights (e.g., leveling up) use larger cards with hard shadows.
- **Icons**: Custom Discord and TikTok icons are integrated for a cohesive Bingeki visual identity.
- **Events**: "User X started reading One Piece", "User Y reached Level 10".

## Watch Parties
Real-time synchronized viewing/reading sessions.
- **State**: A Firestore document `watchparties/{partyId}` holds the current state (Work ID, Chapter/Episode number, IsPaused).
- **Sync**: All participants subscribe to this document. When the host updates the episode, everyone's UI updates instantly.

## Challenges (WIP)
Competitive goals between friends.
- *Examples*: "Read 50 chapters this week", "Finish 'Bleach' before your friend".

## Social Sharing & Generator 📸

Bingeki V2 provides tools to share your progress beautifully on social media.

### Social Generator (Admin)
The admin panel includes a **Social Generator** tool (`src/pages/admin/SocialGenerator.tsx`) that allows admins to create high-quality preview images for the app's promotional content.
- **Dynamic Previews**: Generates layouts based on current user data or news articles.
- **Customizable**: Allows tweaking text, backgrounds, and shadows before exporting.

### Profile Sharing
Every user profile has a unique SEO-optimized URL. When shared on Discord, Twitter, or WhatsApp, it displays a dynamic "Hunter License" card.
- **Dynamic SEO**: See [SEO & Social Sharing](./SEO-Social-Sharing.md) for technical details on how these cards are generated.
