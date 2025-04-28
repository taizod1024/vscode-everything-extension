import * as vscode from "vscode";
const fs = require("fs");

// TODO 前回値保持
// TODO 初回の遅さ

/** everything-search-extesnion class */
class EverythingExtension {
  /** application id for vscode */
  public readonly appId = "everything-extension";

  /** application name */
  public readonly appName = "Everything Extension";

  /** configuration key */
  public readonly appCfgKey = "everythingExtension";

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
          const path = selectedItem.label + "\\" + selectedItem.description;
          const config = vscode.workspace.getConfiguration(this.appCfgKey);
          if (config.debug) {
            this.channel.appendLine(`debug: selected='${path}'`);
          }
          if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path), { forceNewWindow: true });
          } else {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.file(path));
          }
        }
        quickPick.hide();
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
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    const url = new URL(`?sort=path&ascending=1&search=${encodeURIComponent(value)}`, config.httpServerUrl).toString();
    const response = await fetch(url);
    const html = await response.text();
    const results1 = html.matchAll(pattern1);
    const results2 = html.matchAll(pattern2);
    const array1 = Array.from(results1).map(result => {
      return {
        label: result[1],
        alwaysShow: true,
      };
    });
    const array2 = Array.from(results2).map(result => {
      return {
        label: result[2],
        description: result[1],
        alwaysShow: true,
      };
    });
    const array = array1.concat(array2);
    if (config.debug) {
      this.channel.appendLine(`debug: value=${value}, url='${url}, count=${array.length}'`);
    }
    return array;
  }
}
export const everythingextension = new EverythingExtension();
