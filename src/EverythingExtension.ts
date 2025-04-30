import * as vscode from "vscode";
const fs = require("fs");

/** everything-search-extesnion class */
class EverythingExtension {
  /** application id for vscode */
  private readonly appId = "everything-extension";

  /** application name */
  private readonly appName = "Everything Extension";

  /** configuration key */
  private readonly appCfgKey = "everythingExtension";

  /** channel on vscode */
  private readonly channel: vscode.OutputChannel;

  /** context */
  private context: vscode.ExtensionContext;

  /** quickpick value name */
  private readonly quickPickValueKey = "quickPickValue";

  /** sort order value name */
  private readonly sortKey = "sort";

  /** sort order array */
  private readonly sortArray = ["sort=name&ascending=0", "sort=name&ascending=1", "sort=path&ascending=0", "sort=path&ascending=1", "sort=size&ascending=0", "sort=size&ascending=1", "sort=date_modified&ascending=0", "sort=date_modified&ascending=1"];
  /** constructor */
  constructor() {
    this.channel = vscode.window.createOutputChannel(this.appName, { log: true });
  }

  /** activate extension */
  private activate(context: vscode.ExtensionContext) {
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
          const msg = `error: ${error}`;
          this.channel.appendLine(msg);
          vscode.window.showErrorMessage(msg);
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

    // input handler
    quickPick.onDidChangeValue(async value => {
      try {
        if (value.match(/\*/g)) {
          value = value.replace(/\*/g, "");
          quickPick.value = value;
          this.changeSort();
          return;
        }
        await this.context.secrets.store(this.quickPickValueKey, quickPick.value || "");
        quickPick.items = await this.searchEverything(value);
      } catch (error) {
        const msg = `error: ${error}, httpServerUrl=${config.httpServerUrl}`;
        this.channel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }
    });

    // accept handler
    quickPick.onDidAccept(() => {
      try {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem && selectedItem.label.match(/[\\/]/)) {
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
          quickPick.hide();
        }
      } catch (error) {
        const msg = `error: ${error}`;
        this.channel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
        return;
      }
    });

    // do search
    quickPick.value = (await this.context.secrets.get(this.quickPickValueKey)) || "";

    // show quickpick
    quickPick.show();
  }

  /** search with everything */
  private async searchEverything(value: string): Promise<vscode.QuickPickItem[]> {
    var pattern1 = new RegExp('<p class="numresults">([^>]+)</p>', "g");
    var pattern2 = new RegExp('<img class="icon" src="/(file|folder).gif" alt="">([^>]+)</a>.*<nobr>([^>]+)</nobr></span></a></td>', "g");
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    const search = encodeURIComponent(value);
    const sort = await this.getSort();
    const url = new URL(`?search=${search}&${sort}`, config.httpServerUrl).toString();
    const response = await fetch(url);
    const html = await response.text();
    const results1 = html.matchAll(pattern1);
    const results2 = html.matchAll(pattern2);
    const array1 = Array.from(results1).map(result => {
      return {
        label: `${value}, result=${result[1].replace("　", "")}, ${sort.replace("&", ", ")}`,
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

  /** get sort */
  private async getSort(): Promise<string> {
    const sort = (await this.context.secrets.get(this.sortKey)) || this.sortArray[0];
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    if (config.debug) {
      this.channel.appendLine(`debug: sort= ${sort}`);
    }
    return sort;
  }

  /** change sort */
  private async changeSort() {
    const sort = await this.getSort();
    const newSort = this.sortArray[(this.sortArray.findIndex(item => item === sort) + 1) % this.sortArray.length];
    await this.context.secrets.store(this.sortKey, newSort || "");
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    if (config.debug) {
      this.channel.appendLine(`debug: sort= ${sort} -> ${newSort} `);
    }
  }
}
export const everythingextension = new EverythingExtension();
