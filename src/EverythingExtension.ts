import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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
    quickPick.onDidAccept(async () => {
      try {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem.label.match("result=")) {
          quickPick.hide();
          return;
        }
        if (selectedItem && selectedItem.label.match(/[\\/]/)) {
          quickPick.hide();
          const pathToAny = selectedItem.label;
          const type = selectedItem.description;
          const config = vscode.workspace.getConfiguration(this.appCfgKey);
          if (config.debug) {
            this.channel.appendLine(`debug: selected='${pathToAny}'`);
          }

          if (type !== "\\") {
            // ファイルが選択された場合
            await this.showFileActions(pathToAny);
          } else {
            // フォルダーが選択された場合
            await this.showFolderNavigation(pathToAny);
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
      const isFolder = result[1] === "folder";
      return {
        label: path,
        description: type,
        iconPath: isFolder ? vscode.ThemeIcon.Folder : vscode.ThemeIcon.File,
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

  /** execute folder action */
  private async executeFolderAction(action: string, folderPath: string) {
    let cmd: string;

    switch (action) {
      case "open folder with vscode":
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folderPath), { forceNewWindow: true });
        break;
      case "open folder with explorer":
        cmd = `explorer "${folderPath}"`;
        require("child_process").exec(cmd);
        break;
      case "open folder with terminal":
        const terminal = vscode.window.createTerminal({
          name: folderPath,
          cwd: folderPath,
        });
        terminal.show();
        break;
      case "open folder with cmd":
        cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${folderPath}' -wait`;
        require("child_process").exec(cmd);
        break;
      case "open folder with cmd as admin":
        cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${folderPath}' -wait -verb runas`;
        require("child_process").exec(cmd);
        break;
      case "open folder with powershell":
        cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${folderPath} && powershell"' -wait`;
        require("child_process").exec(cmd);
        break;
      case "open folder with powershell as admin":
        cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${folderPath} && powershell"' -wait -verb runas`;
        require("child_process").exec(cmd);
        break;
      case "copy path to clipboard":
        await vscode.env.clipboard.writeText(folderPath);
        vscode.window.showInformationMessage(`Path copied to clipboard: ${folderPath}`);
        break;
    }
  }

  /** execute file action */
  private async executeFileAction(action: string, filePath: string) {
    let cmd: string;
    const parentPath = path.dirname(filePath);

    switch (action) {
      case "open file with vscode":
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filePath));
        break;
      case "open folder with vscode":
        const forceNewWindow = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0;
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(parentPath), { forceNewWindow: forceNewWindow });
        break;
      case "open folder with explorer":
        cmd = `explorer /select,"${filePath}"`;
        require("child_process").exec(cmd);
        break;
      case "open folder with terminal":
        const terminal = vscode.window.createTerminal({
          name: parentPath,
          cwd: parentPath,
        });
        terminal.show();
        break;
      case "open folder with cmd":
        cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${parentPath}' -wait`;
        require("child_process").exec(cmd);
        break;
      case "open folder with cmd as admin":
        cmd = `powershell -command start-process 'cmd.exe' -Argumentlist '/K','cd /d ${parentPath}' -wait -verb runas`;
        require("child_process").exec(cmd);
        break;
      case "open folder with powershell":
        cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${parentPath} && powershell"' -wait`;
        require("child_process").exec(cmd);
        break;
      case "open folder with powershell as admin":
        cmd = `powershell -command start-process 'cmd.exe' -ArgumentList '/c "cd /d ${parentPath} && powershell"' -wait -verb runas`;
        require("child_process").exec(cmd);
        break;
      case "open file with default application":
        cmd = `explorer "${filePath}"`;
        require("child_process").exec(cmd);
        break;
      case "copy path to clipboard":
        await vscode.env.clipboard.writeText(filePath);
        vscode.window.showInformationMessage(`Path copied to clipboard: ${filePath}`);
        break;
    }
  }

  /** show file action quickpick */
  private async showFileActions(filePath: string) {
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    if (config.debug) {
      this.channel.appendLine(`debug: showing file actions for='${filePath}'`);
    }

    // アクション定義
    const OPEN_FILE_WITH_VSCODE = "open file with vscode";
    const OPEN_FOLDER_WITH_VSCODE = "open folder with vscode";
    const OPEN_FOLDER_WITH_EXPLORER = "open folder with explorer";
    const OPEN_FOLDER_WITH_TERMINAL = "open folder with terminal";
    const OPEN_FOLDER_WITH_CMD = "open folder with cmd";
    const OPEN_FOLDER_WITH_POWERSHELL = "open folder with powershell";
    const OPEN_FOLDER_WITH_CMD_AS_ADMIN = "open folder with cmd as admin";
    const OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN = "open folder with powershell as admin";
    const OPEN_FILE_WITH_DEFAULT_APPLICATION = "open file with default application";
    const COPY_PATH_TO_CLIPBOARD = "copy path to clipboard";

    const fileActions: vscode.QuickPickItem[] = [
      { label: `$(folder) .`, description: "\\" },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: `$(vscode) ${OPEN_FILE_WITH_VSCODE}`, alwaysShow: true },
      { label: `$(vscode) ${OPEN_FOLDER_WITH_VSCODE}`, alwaysShow: true },
      { label: `$(folder-opened) ${OPEN_FOLDER_WITH_EXPLORER}`, alwaysShow: true },
      { label: `$(terminal) ${OPEN_FOLDER_WITH_TERMINAL}`, alwaysShow: true },
      { label: `$(terminal-cmd) ${OPEN_FOLDER_WITH_CMD}`, alwaysShow: true },
      { label: `$(shield) ${OPEN_FOLDER_WITH_CMD_AS_ADMIN}`, alwaysShow: true },
      { label: `$(terminal-powershell) ${OPEN_FOLDER_WITH_POWERSHELL}`, alwaysShow: true },
      { label: `$(shield) ${OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN}`, alwaysShow: true },
      { label: `$(link-external) ${OPEN_FILE_WITH_DEFAULT_APPLICATION}`, alwaysShow: true },
      { label: `$(clippy) ${COPY_PATH_TO_CLIPBOARD}`, alwaysShow: true },
    ];

    const fileName = path.basename(filePath);
    const selection = await vscode.window.showQuickPick(fileActions, {
      placeHolder: `${fileName}`,
    });

    if (!selection) {
      return;
    }

    // 同一フォルダが選択された場合はフォルダナビゲーションを表示
    if (selection.description === "\\" && selection.label.includes(".")) {
      const parentPath = path.dirname(filePath);
      await this.showFolderNavigation(parentPath);
      return;
    }

    // アイコン付きラベルから元のアクション文字列を抽出
    const action = this.getLabelNoIcon(selection.label);
    await this.executeFileAction(action, filePath);
  }

  private getLabelNoIcon(iconLabel: string): string {
    const label = iconLabel.replace(/^\$\([^)]+\)\s+/, "");
    return label;
  }

  /** get subfolders in a directory */
  private async getSubfolders(dirPath: string): Promise<vscode.QuickPickItem[]> {
    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const folders = items
        .filter(item => item.isDirectory())
        .map(folder => ({
          label: `$(file-directory) ${folder.name}`,
          description: "\\",
        }));
      return folders;
    } catch (error) {
      return [];
    }
  }

  /** get files in a directory */
  private async getFiles(dirPath: string): Promise<vscode.QuickPickItem[]> {
    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files = items
        .filter(item => item.isFile())
        .map(file => ({
          label: `$(file) ${file.name}`,
          description: "",
        }));
      return files;
    } catch (error) {
      return [];
    }
  }

  /** show folder navigation quickpick */
  private async showFolderNavigation(initialFolderPath: string) {
    let currentFolderPath = initialFolderPath;
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    if (config.debug) {
      this.channel.appendLine(`debug: navigating to folder='${currentFolderPath}'`);
    }

    while (true) {
      // フォルダ内のサブフォルダとファイルを取得
      const subfolders = await this.getSubfolders(currentFolderPath);
      const files = await this.getFiles(currentFolderPath);

      // 親フォルダを追加（ルートディスクでない場合）
      const parentPath = path.dirname(currentFolderPath);
      const navigationItems: vscode.QuickPickItem[] = [
        { label: `$(search) search`, description: "search", alwaysShow: true },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
      ];

      // ルートディレクトリでない場合のみ親フォルダを表示
      const isRootDirectory = path.parse(currentFolderPath).root === currentFolderPath;
      if (!isRootDirectory) {
        navigationItems.push({
          label: `$(file-directory) ..`,
          description: "\\",
        });
      }

      // アクション定義
      const OPEN_FOLDER_WITH_VSCODE = "open folder with vscode";
      const OPEN_FOLDER_WITH_EXPLORER = "open folder with explorer";
      const OPEN_FOLDER_WITH_TERMINAL = "open folder with terminal";
      const OPEN_FOLDER_WITH_CMD = "open folder with cmd";
      const OPEN_FOLDER_WITH_POWERSHELL = "open folder with powershell";
      const OPEN_FOLDER_WITH_CMD_AS_ADMIN = "open folder with cmd as admin";
      const OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN = "open folder with powershell as admin";
      const COPY_PATH_TO_CLIPBOARD = "copy path to clipboard";

      const folderActions: vscode.QuickPickItem[] = [
        { label: `$(vscode) ${OPEN_FOLDER_WITH_VSCODE}`, alwaysShow: true },
        { label: `$(folder-opened) ${OPEN_FOLDER_WITH_EXPLORER}`, alwaysShow: true },
        { label: `$(terminal) ${OPEN_FOLDER_WITH_TERMINAL}`, alwaysShow: true },
        { label: `$(terminal-cmd) ${OPEN_FOLDER_WITH_CMD}`, alwaysShow: true },
        { label: `$(shield) ${OPEN_FOLDER_WITH_CMD_AS_ADMIN}`, alwaysShow: true },
        { label: `$(terminal-powershell) ${OPEN_FOLDER_WITH_POWERSHELL}`, alwaysShow: true },
        { label: `$(shield) ${OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN}`, alwaysShow: true },
        { label: `$(clippy) ${COPY_PATH_TO_CLIPBOARD}`, alwaysShow: true },
      ];

      // サブフォルダとファイルがある場合は区切り線を追加してアクションの前に配置
      const allFolders = [...navigationItems, ...subfolders];
      const allContents = [...allFolders, ...files];

      let allItems: vscode.QuickPickItem[] = [];
      if (allContents.length > 0) {
        allItems = [...allContents, { label: "", kind: vscode.QuickPickItemKind.Separator }, ...folderActions];
      } else {
        allItems = folderActions;
      }

      if (config.debug) {
        this.channel.appendLine(`debug: folders=${subfolders.length}, files=${files.length}, total=${allContents.length}`);
      }

      const selection = await vscode.window.showQuickPick(allItems, {
        placeHolder: `${currentFolderPath}`,
      });

      if (!selection) {
        return; // ユーザーがキャンセルした場合はループを抜ける
      }

      // 検索が選択された場合は現在のパスで検索を実行
      if (selection.description === "search") {
        await this.searchWithInitialPath(currentFolderPath);
        return; // 検索後はループを抜ける
      }

      // サブフォルダまたは親フォルダが選択された場合は次のフォルダに移動
      if (selection.description === "\\") {
        const label = this.getLabelNoIcon(selection.label);
        currentFolderPath = label === ".." ? parentPath : path.join(currentFolderPath, label);
        continue; // ループを継続
      }

      // ファイルが選択された場合はファイルアクションを表示
      if (selection.description === "") {
        const fileName = this.getLabelNoIcon(selection.label);
        const filePath = path.join(currentFolderPath, fileName);
        await this.showFileActions(filePath);
      } else {
        // アクションが選択された場合はアクションを実行してループを抜ける
        const action = this.getLabelNoIcon(selection.label);
        await this.executeFolderAction(action, currentFolderPath);
      }
      break; // ループを抜ける
    }
  }

  /** search with initial path */
  private async searchWithInitialPath(initialPath: string) {
    // init quickpick
    const config = vscode.workspace.getConfiguration(this.appCfgKey);
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Type to search ...";

    // init search with folder path
    const searchValue = initialPath || (await this.context.secrets.get(this.quickPickValueKey)) || "";
    quickPick.value = searchValue;

    try {
      quickPick.items = await this.searchEverything(searchValue);
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
    quickPick.onDidAccept(async () => {
      try {
        const selectedItem = quickPick.selectedItems[0];
        if (selectedItem.label.match("result=")) {
          quickPick.hide();
          return;
        }
        if (selectedItem && selectedItem.label.match(/[\\/]/)) {
          quickPick.hide();
          const pathToAny = selectedItem.label;
          const type = selectedItem.description;
          const config = vscode.workspace.getConfiguration(this.appCfgKey);
          if (config.debug) {
            this.channel.appendLine(`debug: selected='${pathToAny}'`);
          }

          if (type !== "\\") {
            // ファイルが選択された場合
            await this.showFileActions(pathToAny);
          } else {
            // フォルダーが選択された場合
            await this.showFolderNavigation(pathToAny);
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
}
export const everythingextension = new EverythingExtension();
