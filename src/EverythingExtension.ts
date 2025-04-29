import * as vscode from "vscode";
const fs = require("fs");

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

  /** context */
  public context: vscode.ExtensionContext;

  /** quicipick value */
  private quickPickValue: string = "";

  /** quickpick value name */
  private readonly quickPickValueName = "quickPickValue";

  /** constructor */
  constructor() {
    this.channel = vscode.window.createOutputChannel(this.appName, { log: true });
  }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {
    this.context = context;
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
    // init quickpick
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Type to search ...";
    quickPick.value = (await this.context.secrets.get(this.quickPickValueName)) || "";

    // do search
    try {
      quickPick.items = await this.searchEverything("");
    } catch (error) {
      this.channel.show();
      this.channel.appendLine(`error: ${error}, httpServerUrl=${config.httpServerUrl}`);
      vscode.window.showErrorMessage(`An error occurred: ${error}, httpServerUrl=${config.httpServerUrl}`);
      return;
    }

    // input handler
    quickPick.onDidChangeValue(async value => {
      try {
        this.quickPickValue = value;
        quickPick.items = await this.searchEverything(value);
      } catch (error) {
        this.channel.show();
        this.channel.appendLine(`error: ${error}, httpServerUrl=${config.httpServerUrl}`);
        return;
      }
    });

    // accept handler
    quickPick.onDidAccept(() => {
      try {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem) {
          this.context.secrets.store(this.quickPickValueName, this.quickPickValue || "");
          const path = selectedItem.label;
          const type = selectedItem.description;
          const config = vscode.workspace.getConfiguration(this.appCfgKey);
          if (config.debug) {
            this.channel.appendLine(`debug: selected='${path}'`);
          }
          if (type !== "\\") {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.file(path));
          } else {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path), { forceNewWindow: true });
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
    var pattern2 = new RegExp('<img class="icon" src="/(file|folder).gif" alt="">([^>]+)</a>.*<nobr>([^>]+)</nobr></span></a></td>', "g");
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
      const path = result[3] + "\\" + result[2];
      const type = result[1] === "folder" ? "\\" : "";
      return {
        label: path,
        description: type,
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
