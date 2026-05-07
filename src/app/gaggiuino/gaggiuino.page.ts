import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudDownloadOutline,
  refreshOutline,
  saveOutline,
  syncOutline,
} from 'ionicons/icons';

import { HeaderComponent } from '../../components/header/header.component';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';

interface GaggiuinoSettings {
  baseUrl: string;
  timeoutMs: number;
  designatedMillUuid: string;
  autoSyncEnabled?: boolean;
}

interface MillEntry {
  name?: string;
  config?: { uuid?: string };
}

interface GaggiuinoShot {
  id: number;
  timestamp?: number;
  profileName?: string;
}

interface GaggiuinoAutoSyncStatus {
  enabled: boolean;
  online: boolean | null;
  running: boolean;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string;
  lastSyncedShotId: number;
  lastImportedCount: number;
  lastSyncSummary?: { added?: number; updated?: number; total?: number };
  nextPollInMs: number;
}

@Component({
  selector: 'gaggiuino',
  templateUrl: './gaggiuino.page.html',
  styleUrls: ['./gaggiuino.page.scss'],
  imports: [
    FormsModule,
    HeaderComponent,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRow,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonToggle,
  ],
})
export class GaggiuinoPage implements OnInit, OnDestroy {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);

  public settings: GaggiuinoSettings = {
    baseUrl: 'http://gaggiuino.local',
    timeoutMs: 5000,
    designatedMillUuid: '',
    autoSyncEnabled: true,
  };
  public mills: MillEntry[] = [];
  public importCount = 6;
  public savedShots: GaggiuinoShot[] = [];
  public status: unknown;
  public statusMessage = 'Not checked';
  public syncMessage = '';
  public autoSyncStatus: GaggiuinoAutoSyncStatus | null = null;
  public autoSyncStatusMessage = '';
  public loading = false;
  public saving = false;
  public importing = false;

  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({
      cloudDownloadOutline,
      refreshOutline,
      saveOutline,
      syncOutline,
    });
  }

  public async ngOnInit() {
    await this.load();
    this.startAutoSyncPolling();
  }

  public ngOnDestroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  public async load() {
    this.loading = true;
    try {
      const [settings, shots, autoSyncStatus] = await Promise.all([
        this.api<GaggiuinoSettings>('/api/gaggiuino/config'),
        this.api<{ shots: GaggiuinoShot[] }>('/api/gaggiuino/shots'),
        this.api<GaggiuinoAutoSyncStatus>('/api/gaggiuino/autosync-status').catch(
          () => null,
        ),
      ]);
      const millStorage = await this.api<{ key: string; value: MillEntry[] }>(
        '/api/storage/MILL',
      ).catch(() => ({ key: 'MILL', value: [] }));

      this.settings = settings;
      this.savedShots = shots.shots || [];
      this.autoSyncStatus = autoSyncStatus;
      this.autoSyncStatusMessage = this.formatAutoSyncStatus(autoSyncStatus);
      this.mills = Array.isArray(millStorage.value) ? millStorage.value : [];
      if (!this.settings.designatedMillUuid) {
        this.settings.designatedMillUuid =
          this.mills[0]?.config?.uuid || '00000000-0000-4000-8000-000000000002';
      }
    } catch (error) {
      this.statusMessage = this.errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  public async saveSettings() {
    this.saving = true;
    try {
      this.settings = await this.api<GaggiuinoSettings>('/api/gaggiuino/config', {
        method: 'PUT',
        body: JSON.stringify(this.settings),
      });
      this.syncMessage = 'Connection settings saved.';
    } catch (error) {
      this.syncMessage = this.errorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  public async checkStatus() {
    this.loading = true;
    this.statusMessage = 'Checking connection...';
    try {
      this.status = await this.api('/api/gaggiuino/status');
      this.statusMessage = 'Gaggiuino reachable.';
    } catch (error) {
      this.status = undefined;
      this.statusMessage = this.errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  public async importLatest() {
    this.importing = true;
    this.syncMessage = 'Importing shots...';
    try {
      const result = await this.api<{
        imported: GaggiuinoShot[];
        sync: { added: number; updated?: number; total: number };
      }>('/api/gaggiuino/shots/import-latest', {
        method: 'POST',
        body: JSON.stringify({
          count: this.importCount,
          syncToBrews: true,
        }),
      });
      await this.refreshAppStorage();
      this.syncMessage = `Imported ${result.imported.length}; synced ${result.sync.added} new brews, updated ${result.sync.updated || 0}.`;
      await this.load();
    } catch (error) {
      this.syncMessage = this.errorMessage(error);
    } finally {
      this.importing = false;
    }
  }

  public async syncSaved() {
    this.importing = true;
    this.syncMessage = 'Syncing saved shots...';
    try {
      const result = await this.api<{
        sync: { added: number; updated?: number; total: number };
      }>(
        '/api/gaggiuino/shots/sync-saved',
        { method: 'POST' },
      );
      await this.refreshAppStorage();
      this.syncMessage = `Synced ${result.sync.added} new brews, updated ${result.sync.updated || 0}. Total brews: ${result.sync.total}. App data refreshed.`;
    } catch (error) {
      this.syncMessage = this.errorMessage(error);
    } finally {
      this.importing = false;
    }
  }

  public formatShot(shot: GaggiuinoShot): string {
    if (!shot.timestamp) {
      return 'No timestamp';
    }

    return new Date(shot.timestamp * 1000).toLocaleString();
  }

  public formatIsoDate(value: string | null | undefined): string {
    if (!value) {
      return 'Never';
    }

    return new Date(value).toLocaleString();
  }

  public async refreshAutoSyncStatus() {
    try {
      const status = await this.api<GaggiuinoAutoSyncStatus>(
        '/api/gaggiuino/autosync-status',
      );
      this.autoSyncStatus = status;
      this.autoSyncStatusMessage = this.formatAutoSyncStatus(status);
    } catch (error) {
      this.autoSyncStatusMessage = this.errorMessage(error);
    }
  }

  private async api<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const runtimeConfig = (window as unknown as {
      __beanconquerorConfig?: { apiBaseUrl?: string; apiAuthToken?: string };
    }).__beanconquerorConfig;
    const rawBaseUrl = runtimeConfig?.apiBaseUrl;
    if (
      !rawBaseUrl ||
      typeof rawBaseUrl !== 'string' ||
      rawBaseUrl.trim() === '' ||
      rawBaseUrl.includes('${') ||
      rawBaseUrl.trimStart().startsWith('$')
    ) {
      throw new Error('Server mode not configured');
    }
    const apiBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/api') ? path.slice(4) : path;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (runtimeConfig?.apiAuthToken) {
      headers.set('X-Beanconqueror-Api-Token', runtimeConfig.apiAuthToken);
    }

    const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
      ...options,
      headers,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || body?.error || response.statusText);
    }

    return body;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private async refreshAppStorage() {
    await Promise.all([
      this.uiBeanStorage.reinitializeStorage(),
      this.uiBrewStorage.reinitializeStorage(),
      this.uiMillStorage.reinitializeStorage(),
      this.uiPreparationStorage.reinitializeStorage(),
    ]);
  }

  private startAutoSyncPolling() {
    this.refreshAutoSyncStatus().catch(() => {});
    this.autoSyncTimer = setInterval(() => {
      this.refreshAutoSyncStatus().catch(() => {});
    }, 15000);
  }

  private formatAutoSyncStatus(status: GaggiuinoAutoSyncStatus | null): string {
    if (!status) {
      return 'Auto-sync status unavailable.';
    }

    if (!status.enabled) {
      return 'Auto-sync disabled.';
    }

    if (status.running) {
      return 'Auto-sync running...';
    }

    if (status.online === true) {
      return `Online. Next poll in ${Math.round((status.nextPollInMs || 0) / 1000)}s.`;
    }

    if (status.online === false) {
      return `Offline. Retrying in ${Math.round((status.nextPollInMs || 0) / 1000)}s.`;
    }

    return 'Auto-sync waiting for first check.';
  }
}

export default GaggiuinoPage;
