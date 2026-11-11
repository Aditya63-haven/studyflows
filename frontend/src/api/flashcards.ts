import apiClient from './client';
import { DeckInput, FlashcardDeck, ReviewRating } from './types';

export const flashcardsApi = {
  async listBySpace(spaceId: string): Promise<FlashcardDeck[]> {
    const { data } = await apiClient.get<{ decks: FlashcardDeck[] }>(
      `/spaces/${spaceId}/decks`,
    );
    return data.decks;
  },

  async get(id: string): Promise<FlashcardDeck> {
    const { data } = await apiClient.get<{ deck: FlashcardDeck }>(`/decks/${id}`);
    return data.deck;
  },

  async create(spaceId: string, input: DeckInput): Promise<FlashcardDeck> {
    const { data } = await apiClient.post<{ deck: FlashcardDeck }>(
      `/spaces/${spaceId}/decks`,
      input,
    );
    return data.deck;
  },

  async update(id: string, input: Partial<DeckInput>): Promise<FlashcardDeck> {
    const { data } = await apiClient.patch<{ deck: FlashcardDeck }>(
      `/decks/${id}`,
      input,
    );
    return data.deck;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/decks/${id}`);
  },

  async reviewCard(
    deckId: string,
    cardId: string,
    rating: ReviewRating,
  ): Promise<FlashcardDeck> {
    const { data } = await apiClient.post<{ deck: FlashcardDeck }>(
      `/decks/${deckId}/cards/${cardId}/review`,
      { rating },
    );
    return data.deck;
  },
};
