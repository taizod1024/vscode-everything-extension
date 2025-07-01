import * as vscode from "vscode";
import * as path from "path";

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

    // init search
    quickPick.value = (await this.context.secrets.get(this.quickPickValueKey)) || "";
    try {
      quickPick.items = await this.searchEverything(quickPick.value);
    } catch (error) {
      const msg = `error: ${error}, httpServerUrl=${config.httpServerUrl}`;
      this.channel.appendLine(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }

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
          quickPick.hide();
          const pathToAny = selectedItem.label;
          const type = selectedItem.description;
          const config = vscode.workspace.getConfiguration(this.appCfgKey);
          if (config.debug) {
            this.channel.appendLine(`debug: selected='${pathToAny}'`);
          }
          const OPEN_WITH_VSCODE = "open with vscode";
          const OPEN_WITH_EXPLORER = "open with explorer";
          const OPEN_WITH_DEFAULT_APPLICATION = "open with default application";
          const COPY_PATH_TO_CLIPBOARD = "copy path to clipboard";
          const OPEN_WITH_CMD = "open with cmd";
          const OPEN_WITH_POWERSHELL = "open with powershell";
          const OPEN_WITH_CMD_AS_ADMIN = "open with cmd as admin";
          const OPEN_WITH_POWERSHELL_AS_ADMIN = "open with powershell as admin";
          if (type !== "\\") {
            vscode.window.showQuickPick([OPEN_WITH_VSCODE, OPEN_WITH_EXPLORER, OPEN_WITH_CMD, OPEN_WITH_CMD_AS_ADMIN, OPEN_WITH_POWERSHELL, OPEN_WITH_POWERSHELL_AS_ADMIN, OPEN_WITH_DEFAULT_APPLICATION, COPY_PATH_TO_CLIPBOARD], { placeHolder: "Choose how to open the selected file" }).then(async selection => {
              if (!selection) {
                return;
              }
              let cmd;
              let parentPath;
              switch (selection) {
                case OPEN_WITH_VSCODE:
                  vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pathToAny));
                  break;
                case OPEN_WITH_EXPLORER:
                  cmd = `explorer /select,"${pathToAny}"`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_CMD:
                  parentPath = path.dirname(pathToAny);
                  cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${parentPath}' -wait`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_CMD_AS_ADMIN:
                  parentPath = path.dirname(pathToAny);
                  cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${parentPath}' -wait -verb runas`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_POWERSHELL:
                  parentPath = path.dirname(pathToAny);
                  cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${parentPath} && powershell"' -wait`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_POWERSHELL_AS_ADMIN:
                  parentPath = path.dirname(pathToAny);
                  cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${parentPath} && powershell"' -wait -verb runas`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_DEFAULT_APPLICATION:
                  cmd = `explorer "${pathToAny}"`;
                  require("child_process").exec(cmd);
                  break;
                case COPY_PATH_TO_CLIPBOARD:
                  await vscode.env.clipboard.writeText(pathToAny);
                  vscode.window.showInformationMessage(`Path copied to clipboard: ${pathToAny}`);
                  break;
              }
            });
          } else {
            vscode.window.showQuickPick([OPEN_WITH_VSCODE, OPEN_WITH_EXPLORER, OPEN_WITH_CMD, OPEN_WITH_CMD_AS_ADMIN, OPEN_WITH_POWERSHELL, OPEN_WITH_POWERSHELL_AS_ADMIN, COPY_PATH_TO_CLIPBOARD], { placeHolder: "Choose how to open the selected folder" }).then(async selection => {
              if (!selection) {
                return;
              }
              let cmd;
              switch (selection) {
                case OPEN_WITH_VSCODE:
                  vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(pathToAny), { forceNewWindow: true });
                  break;
                case OPEN_WITH_EXPLORER:
                  cmd = `explorer "${pathToAny}"`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_CMD:
                  cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${pathToAny}' -wait`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_CMD_AS_ADMIN:
                  cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${pathToAny}' -wait -verb runas`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_POWERSHELL:
                  cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${pathToAny} && powershell"' -wait`;
                  require("child_process").exec(cmd);
                  break;
                case OPEN_WITH_POWERSHELL_AS_ADMIN:
                  cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${pathToAny} && powershell"' -wait -verb runas`;
                  require("child_process").exec(cmd);
                  break;
                case COPY_PATH_TO_CLIPBOARD:
                  await vscode.env.clipboard.writeText(pathToAny);
                  vscode.window.showInformationMessage(`Path copied to clipboard: ${pathToAny}`);
                  break;
              }
            });
          }
        }
      } catch (error) {
        const msg = `error: ${error}`;
        this.channel.appendLine(msg);
        vscode.window.showErrorMessage(msg);
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

  /** runas admin */
  private async runCmdAsAdmin(pathToAny: string) {
    let cmdAsAdmin = `powershell -command start-process 'cmd.exe' -argumentlist '/c','powershell','cd ${pathToAny}' -verb runas -wait`;
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
