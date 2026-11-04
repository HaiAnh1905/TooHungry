import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioNotificationService } from './audio-notification.service';

describe('AudioNotificationService', () => {
  let service: AudioNotificationService;
  let store: Record<string, string> = {};

  const mockLocalStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    if (typeof window !== 'undefined') {
      (window as any).localStorage = mockLocalStorage;
    }
    service = new AudioNotificationService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize with muted=false when no storage preference', () => {
    expect(service.isMuted()).toBe(false);
  });

  it('should toggle mute state and persist in localStorage', () => {
    const isMutedNow = service.toggleMute();
    expect(isMutedNow).toBe(true);
    expect(service.isMuted()).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('too_hungry_cashier_audio_muted', 'true');

    const unmuted = service.toggleMute();
    expect(unmuted).toBe(false);
    expect(service.isMuted()).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('too_hungry_cashier_audio_muted', 'false');
  });

  it('should restore muted=true from localStorage on initialization', () => {
    store['too_hungry_cashier_audio_muted'] = 'true';
    const newService = new AudioNotificationService();
    expect(newService.isMuted()).toBe(true);
  });

  it('should not throw when playChime or playAlert is called', () => {
    expect(() => service.playChime()).not.toThrow();
    expect(() => service.playAlert()).not.toThrow();

    service.toggleMute(); // muted = true
    expect(() => service.playChime()).not.toThrow();
    expect(() => service.playAlert()).not.toThrow();
  });
});
