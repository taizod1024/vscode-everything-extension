import * as vscode from "vscode";

/** everything-search-extesnion class */
class EverythingSearch {
  /** application id for vscode */
  public readonly appId = "everything-search";

  /** application name */
  public readonly appName = "Everything Search";

  /** channel on vscode */
  public readonly channel: vscode.OutputChannel;

  /** constructor */
  constructor() {
    this.channel = vscode.window.createOutputChannel(this.appName, { log: true });
    this.channel.show(true);
    this.channel.appendLine(`${this.appName}`);
  }

  /** activate extension */
  public activate(context: vscode.ExtensionContext) {
    let cmdname = "";

    // init command
    cmdname = `${this.appId}.search`;
    context.subscriptions.push(
      vscode.commands.registerCommand(`${cmdname}`, async () => {
        try {
          await this.search();
        } catch (reason) {
          this.channel.show();
          everythingsearch.channel.appendLine("**** " + reason + " ****");
        }
      })
    );
  }

  /** search any */
  private async search() {
    this.channel.appendLine(`search:`);

    // quickpick
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Type to search files...";

    // input handler
    quickPick.onDidChangeValue(async value => {
      this.channel.appendLine(`onDidChangeValue: ${value}`);
      if (value.trim().length === 0) {
        quickPick.items = [];
        return;
      }

      // Web APIを呼び出して結果を取得
      const results = [value, value + "1", value + "2"];

      // QuickPickの候補を更新
      quickPick.items = results.map(file => ({ label: file }));
    });

    // accept handler
    quickPick.onDidAccept(() => {
      this.channel.appendLine(`onDidAccept:`);
      const selectedItem = quickPick.selectedItems[0];
      if (selectedItem) {
        this.channel.appendLine(`selected item: ${selectedItem.label}`);
      }
      quickPick.hide();
    });

    // dispose handler
    quickPick.onDidHide(() => {
      this.channel.appendLine(`onDidHide:`);
      quickPick.dispose();
    });

    // show quickpick
    quickPick.show();
  }
}
export const everythingsearch = new EverythingSearch();
