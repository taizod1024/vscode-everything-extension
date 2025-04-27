import * as vscode from "vscode";

// TODO webサーバ設定
// TODO 前回値保持
// TODO 初回の遅さ

/** everything-search-extesnion class */
class EverythingExtension {
  /** application id for vscode */
  public readonly appId = "everything-extension";

  /** application name */
  public readonly appName = "Everything Extension";

  /** channel on vscode */
  public readonly channel: vscode.OutputChannel;

  /** constructor */
  constructor() {
    this.channel = vscode.window.createOutputChannel(this.appName, { log: true });
  }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {
    this.channel.appendLine(`${this.appName}`);
    let cmdname = "";

    // init command
    cmdname = `${this.appId}.search`;
    context.subscriptions.push(
      vscode.commands.registerCommand(`${cmdname}`, async () => {
        try {
          await this.search();
        } catch (error) {
          this.channel.show();
          this.channel.appendLine(`error: ${error}`);
          return;
        }
      })
    );
  }

  /** search any */
  private async search() {
    // quickpick
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Type to search ...";
    quickPick.items = await this.searchEverything("");

    // input handler
    quickPick.onDidChangeValue(async value => {
      try {
        quickPick.items = await this.searchEverything(value);
      } catch (error) {
        this.channel.show();
        this.channel.appendLine(`error: ${error}`);
        return;
      }
    });

    // accept handler
    quickPick.onDidAccept(() => {
      try {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem) {
          this.channel.appendLine(`- selected: '${selectedItem.description}\\${selectedItem.label}'`);
        }
        quickPick.hide();
      } catch (error) {
        this.channel.show();
        this.channel.appendLine(`error: ${error}`);
        return;
      }
    });

    // dispose handler
    quickPick.onDidHide(() => {
      try {
        quickPick.dispose();
      } catch (error) {
        this.channel.show();
        this.channel.appendLine(`error: ${error}`);
        return;
      }
    });

    // show quickpick
    quickPick.show();
  }

  /** search with everything */
  private async searchEverything(value: string): Promise<vscode.QuickPickItem[]> {
    var pattern1 = new RegExp('<p class="numresults">([^>]+)</p>', "g");
    var pattern2 = new RegExp('alt="">([^>]+)</a>.*<nobr>([^>]+)</nobr></span></a></td>', "g");
    const baseurl = "http://localhost";
    const url = `${baseurl}/?search=${encodeURIComponent(value)}`;
    const response = await fetch(url);
    const html = await response.text();
    const results1 = html.matchAll(pattern1);
    const results2 = html.matchAll(pattern2);
    const array1 = Array.from(results1).map(result => {
      return {
        label: value,
        description: result[1],
      };
    });
    const array2 = Array.from(results2).map(result => {
      return {
        label: result[1],
        description: result[2],
      };
    });
    const array = array1.concat(array2);
    return array;
  }
}
export const everythingextension = new EverythingExtension();
