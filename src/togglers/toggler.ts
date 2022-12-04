import { Events, Notice } from 'obsidian';
import type { App } from 'obsidian';
import DynamicHighlightsPlugin from 'src/main';

const O_RUNNER_ICON = '⌘';
const O_RUNNER_ICON_CLEAR = '✕';
const O_NOT_OPEN_FILE = 'Please open a file first.';

// Runner
const O_RUNNER = 'dynamic-highlights-runner';
const O_RUNNER_ACTIVE = 'dynamic-highlights-runner--active';
const O_RUNNER_CLEAR = 'dynamic-highlights-runner--clear';
const O_RUNNER_HIDDEN = 'dynamic-highlights-runner--hidden';
const O_RUNNER_LOADING = 'dynamic-highlights-runner--loading';


interface IOrthographyToggler {
  init(): void;
}

let self: any;

export class OrthographyToggler implements IOrthographyToggler {
  private app: App;
  // private settings: OrthographySettings;
  private emitter: any;
  private toggler: any;
  private showed: false;

  constructor(app: App,
    // settings: OrthographySettings,
    emitter: Events) {
    this.app = app;
    // this.settings = settings;
    this.emitter = emitter;
  }

  public init(): void {
    self = this;
    this.createButton(O_RUNNER_ICON);
  }

  public destroy(): void {
    this.removeLoading();
    this.toggler.removeEventListener('click', this.toggle);
    this.removeButton();
  }

  public toggle(): void {
    const activeEditor = self.getEditor();
    if (!activeEditor) {
      if (self.showed) {
        self.setButtonWithRunner();
        self.showed = false;
      } else {
        new Notice(O_NOT_OPEN_FILE);
      }
      return;
    }
    self.showed = !self.showed;
    if (self.showed) {
      self.setButtonWithClear();
    } else {
      self.setButtonWithRunner();
    }
  }

  public hide(): void {
    const runner = document.querySelector('.' + O_RUNNER);
    runner!.classList.add(O_RUNNER_HIDDEN);
  }

  public setLoading(): void {
    this.toggler.classList.add(O_RUNNER_LOADING);
  }

  public removeLoading(): void {
    this.toggler.classList.remove(O_RUNNER_LOADING);
  }

  public reset(): void {
    this.showed = false;
    this.removeLoading();
    this.updateButtonText(O_RUNNER_ICON);
  }

  private createButton(text: string) {
    this.toggler = document.createElement('button');
    const icon = document.createElement('span');
    icon.innerText = text;
    this.toggler.classList.add(O_RUNNER);
    this.toggler.appendChild(icon);
    document.body.appendChild(this.toggler);
    this.toggler.addEventListener('click', this.toggle);
  }

  private updateButtonText(text: string) {
    const toggler: HTMLElement = document.querySelector(`.${O_RUNNER} span`)!;
    if (toggler) toggler.innerText = text;
  }

  private removeButton() {
    const toggler: HTMLElement = document.querySelector(`.${O_RUNNER}`)!;
    if (toggler) toggler.remove();
  }

  private setButtonWithClear() {
    self.updateButtonText(O_RUNNER_ICON_CLEAR);
    self.emitter.trigger('orthography:open');
  }

  private setButtonWithRunner() {
    self.updateButtonText(O_RUNNER_ICON);
    self.removeLoading();
    self.emitter.trigger('orthography:close');
  }

  private getEditor() {
    const activeLeaf: any = this.app.workspace.activeLeaf;
    const sourceMode = activeLeaf.view.sourceMode;
    if (!sourceMode) return null;
    return activeLeaf.view.sourceMode.cmEditor;
  }
}


// interface SettingsData {
//   displayRunner: boolean;
//   useGrammar: boolean;
//   language: string;
// }

// function getDefaultData(): SettingsData {
//   return {
//     displayRunner: true,
//     useGrammar: false,
//     language: 'en, ru, uk'
//   };
// }

// export class OrthographySettings {
//   private data: SettingsData;
//   private emitter: any;

//   constructor(private plugin: DynamicHighlightsPlugin, emitter: Events) {
//     this.data = getDefaultData();
//     this.emitter = emitter;
//   }

//   get displayRunner(): boolean {
//     const { data } = this;
//     return data.displayRunner;
//   }

//   set displayRunner(value: boolean) {
//     const { data } = this;
//     data.displayRunner = value;
//     this.emitter.trigger('onUpdateSettings', this.data);
//   }



//   async loadSettings(): Promise<void> {
//     const { plugin } = this;
//     this.data = Object.assign(getDefaultData(), await plugin.loadData());
//   }

//   async saveSettings(): Promise<void> {
//     const { plugin, data } = this;
//     if (plugin && data) {
//       await plugin.saveData(data);
//     }
//   }
// }