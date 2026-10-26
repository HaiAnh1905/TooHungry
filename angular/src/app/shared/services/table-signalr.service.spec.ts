import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector } from '@angular/core';
import { EnvironmentService } from '@abp/ng.core';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';
import { TableSignalrService } from './table-signalr.service';
import * as signalR from '@microsoft/signalr';

describe('TableSignalrService', () => {
  let service: TableSignalrService;
  let mockEnvironmentService: { getApiUrl: ReturnType<typeof vi.fn> };
  let mockOAuthService: {
    hasValidAccessToken: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
    events: Subject<OAuthEvent>;
  };
  let mockHubConnection: any;
  let mockWithUrlSpy: ReturnType<typeof vi.fn>;
  let capturedUrlOptions: any;

  beforeEach(() => {
    mockEnvironmentService = {
      getApiUrl: vi.fn().mockReturnValue('https://localhost:44353'),
    };

    mockOAuthService = {
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      getAccessToken: vi.fn().mockReturnValue('mock-jwt-token-xyz'),
      refreshToken: vi.fn().mockResolvedValue({}),
      events: new Subject<OAuthEvent>(),
    };

    mockHubConnection = {
      state: signalR.HubConnectionState.Disconnected,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      onclose: vi.fn(),
    };

    mockWithUrlSpy = vi.fn().mockImplementation(function (url: string, options: any) {
      capturedUrlOptions = options;
      return {
        withAutomaticReconnect: vi.fn().mockReturnValue({
          configureLogging: vi.fn().mockReturnValue({
            build: vi.fn().mockReturnValue(mockHubConnection),
          }),
        }),
      };
    });

    vi.spyOn(signalR, 'HubConnectionBuilder').mockImplementation(function (this: any) {
      return {
        withUrl: mockWithUrlSpy,
      } as any;
    });

    capturedUrlOptions = undefined;
  });

  const createService = (hasToken: boolean) => {
    mockOAuthService.hasValidAccessToken.mockReturnValue(hasToken);

    const injector = Injector.create({
      providers: [
        { provide: TableSignalrService, useClass: TableSignalrService },
        { provide: EnvironmentService, useValue: mockEnvironmentService },
        { provide: OAuthService, useValue: mockOAuthService },
      ],
    });

    service = injector.get(TableSignalrService);
  };

  it('should NOT establish connection on startup when unauthenticated', () => {
    createService(false);
    expect(mockWithUrlSpy).not.toHaveBeenCalled();
    expect(service.getHubConnection()).toBeUndefined();
  });

  it('should initialize connection with accessTokenFactory when authenticated', () => {
    createService(true);
    expect(mockWithUrlSpy).toHaveBeenCalled();
    expect(capturedUrlOptions).toBeDefined();
    expect(capturedUrlOptions.withCredentials).toBe(true);

    const token = capturedUrlOptions.accessTokenFactory();
    expect(token).toBe('mock-jwt-token-xyz');
    expect(mockOAuthService.getAccessToken).toHaveBeenCalled();
  });

  it('should connect when token_received event occurs after login', () => {
    createService(false);
    expect(mockWithUrlSpy).not.toHaveBeenCalled();

    mockOAuthService.hasValidAccessToken.mockReturnValue(true);
    mockOAuthService.events.next({ type: 'token_received' } as OAuthEvent);

    expect(mockWithUrlSpy).toHaveBeenCalled();
    expect(capturedUrlOptions.accessTokenFactory()).toBe('mock-jwt-token-xyz');
  });

  it('should stop connection when logout event occurs', () => {
    createService(true);
    expect(service.getHubConnection()).toBeDefined();

    mockOAuthService.events.next({ type: 'logout' } as OAuthEvent);

    expect(mockHubConnection.stop).toHaveBeenCalled();
    expect(service.getHubConnection()).toBeUndefined();
  });
});
