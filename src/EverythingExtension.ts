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

    // init command for current file actions
    cmdname = `${this.appId}.fileActions`;
    context.subscriptions.push(
      vscode.commands.registerCommand(`${cmdname}`, async () => {
        try {
          await this.showCurrentFileActions();
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

  /** show file actions for currently opened file */
  private async showCurrentFileActions() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage("No file is currently open");
      return;
    }

    const filePath = activeEditor.document.uri.fsPath;
    if (!filePath) {
      vscode.window.showWarningMessage("Current file has no file path");
      return;
    }

    // Show file actions for the current file
    await this.showFileActions(filePath);
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
    const SEARCH_EVERYTHING = "search everything";

    const fileActions: vscode.QuickPickItem[] = [
      { label: `$(folder) .`, description: "\\" },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: `$(vscode)`, description: OPEN_FILE_WITH_VSCODE, alwaysShow: true },
      { label: `$(vscode)`, description: OPEN_FOLDER_WITH_VSCODE, alwaysShow: true },
      { label: `$(folder-opened)`, description: OPEN_FOLDER_WITH_EXPLORER, alwaysShow: true },
      { label: `$(terminal)`, description: OPEN_FOLDER_WITH_TERMINAL, alwaysShow: true },
      { label: `$(terminal-cmd)`, description: OPEN_FOLDER_WITH_CMD, alwaysShow: true },
      { label: `$(shield)`, description: OPEN_FOLDER_WITH_CMD_AS_ADMIN, alwaysShow: true },
      { label: `$(terminal-powershell)`, description: OPEN_FOLDER_WITH_POWERSHELL, alwaysShow: true },
      { label: `$(shield)`, description: OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN, alwaysShow: true },
      { label: `$(link-external)`, description: OPEN_FILE_WITH_DEFAULT_APPLICATION, alwaysShow: true },
      { label: `$(clippy)`, description: COPY_PATH_TO_CLIPBOARD, alwaysShow: true },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: `$(search)`, description: SEARCH_EVERYTHING },
    ];

    const fileName = path.basename(filePath);
    const selection = await vscode.window.showQuickPick(fileActions, {
      placeHolder: `file: ${fileName}`,
    });

    if (!selection) {
      return;
    }

    // 検索が選択された場合は現在のファイルの親パスで検索を実行
    if (selection.description === SEARCH_EVERYTHING) {
      await this.searchWithInitialPath(filePath);
      return;
    }

    // 同一フォルダが選択された場合はフォルダナビゲーションを表示
    if (selection.description === "\\" && selection.label.includes(".")) {
      const parentPath = path.dirname(filePath);
      await this.showFolderNavigation(parentPath);
      return;
    }

    // アイコン付きラベルから元のアクション文字列を抽出
    const action = selection.description;
    await this.executeFileAction(action, filePath);
  }

  private getLabelNoIcon(iconLabel: string): string {
    const label = iconLabel.replace(/^\$\([^)]+\)\s+/, "");
    return label;
  }

  /** get subfolders in a directory */
  private async getSubfolders(dirPath: string): Promise<vscode.QuickPickItem[]> {
    // 空文字の場合はドライブ一覧を返す
    if (dirPath === "") {
      return await this.getAvailableDrives();
    }

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
    // 空文字の場合（ドライブ一覧表示時）はファイルなし
    if (dirPath === "") {
      return [];
    }

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

  /** get available drives (Windows only) */
  private async getAvailableDrives(): Promise<vscode.QuickPickItem[]> {
    const drives: vscode.QuickPickItem[] = [];

    if (process.platform === "win32") {
      const driveLetters = ["C:", "D:", "E:", "F:", "G:", "H:", "I:", "J:", "K:", "L:", "M:", "N:", "O:", "P:", "Q:", "R:", "S:", "T:", "U:", "V:", "W:", "X:", "Y:", "Z:"];

      for (const drive of driveLetters) {
        try {
          await fs.promises.access(drive + "\\");
          drives.push({
            label: `$(device-desktop) ${drive}`,
            description: "\\",
          });
        } catch (error) {
          // ドライブが存在しない場合は無視
        }
      }
    }

    return drives;
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

      // 親フォルダを追加（空文字でもルートディレクトリでもない場合）
      const parentPath = path.dirname(currentFolderPath);
      const navigationItems: vscode.QuickPickItem[] = [];

      // 空文字（ドライブ一覧）でない場合のみ親フォルダを表示
      if (currentFolderPath !== "") {
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
      const SEARCH_EVERYTHING = "search everything";

      // サブフォルダとファイルがある場合は区切り線を追加してアクションの前に配置
      const allFolders = [...navigationItems, ...subfolders];
      const allContents = [...allFolders, ...files];

      let allItems: vscode.QuickPickItem[] = [];
      if (currentFolderPath === "") {
        // ドライブ一覧の場合は search アクションのみ表示
        allItems = [...allContents, { label: "", kind: vscode.QuickPickItemKind.Separator }, { label: `$(search)`, description: SEARCH_EVERYTHING, alwaysShow: true }];
      } else {
        // 通常のフォルダの場合は全てのアクションを表示
        allItems = [
          ...allContents,
          { label: "", kind: vscode.QuickPickItemKind.Separator },
          { label: `$(vscode)`, description: OPEN_FOLDER_WITH_VSCODE, alwaysShow: true },
          { label: `$(folder-opened)`, description: OPEN_FOLDER_WITH_EXPLORER, alwaysShow: true },
          { label: `$(terminal)`, description: OPEN_FOLDER_WITH_TERMINAL, alwaysShow: true },
          { label: `$(terminal-cmd)`, description: OPEN_FOLDER_WITH_CMD, alwaysShow: true },
          { label: `$(shield)`, description: OPEN_FOLDER_WITH_CMD_AS_ADMIN, alwaysShow: true },
          { label: `$(terminal-powershell)`, description: OPEN_FOLDER_WITH_POWERSHELL, alwaysShow: true },
          { label: `$(shield)`, description: OPEN_FOLDER_WITH_POWERSHELL_AS_ADMIN, alwaysShow: true },
          { label: `$(clippy)`, description: COPY_PATH_TO_CLIPBOARD, alwaysShow: true },
          { label: "", kind: vscode.QuickPickItemKind.Separator },
          { label: `$(search)`, description: SEARCH_EVERYTHING, alwaysShow: true },
        ];
      }

      if (config.debug) {
        this.channel.appendLine(`debug: folders=${subfolders.length}, files=${files.length}, total=${allContents.length}`);
      }

      const selection = await vscode.window.showQuickPick(allItems, {
        placeHolder: currentFolderPath === "" ? "drives:" : `folder: ${currentFolderPath}`,
      });

      if (!selection) {
        return; // ユーザーがキャンセルした場合はループを抜ける
      }

      // 検索が選択された場合は現在のパスで検索を実行
      if (selection.description === SEARCH_EVERYTHING) {
        // 空文字（ドライブ一覧）の場合は空文字で検索
        await this.searchWithInitialPath(currentFolderPath);
        return; // 検索後はループを抜ける
      }

      // サブフォルダまたは親フォルダが選択された場合は次のフォルダに移動
      if (selection.description === "\\") {
        const label = this.getLabelNoIcon(selection.label);
        if (label === "..") {
          // ルートディレクトリの場合は空文字（ドライブ一覧）に移動
          const isRootDirectory = path.parse(currentFolderPath).root === currentFolderPath;
          currentFolderPath = isRootDirectory ? "" : parentPath;
        } else if (currentFolderPath === "") {
          // ドライブの場合
          currentFolderPath = label + "\\";
        } else {
          // サブフォルダの場合
          currentFolderPath = path.join(currentFolderPath, label);
        }
        continue; // ループを継続
      }

      // ファイルが選択された場合はファイルアクションを表示
      if (selection.description === "") {
        const fileName = this.getLabelNoIcon(selection.label);
        const filePath = currentFolderPath === "" ? fileName : path.join(currentFolderPath, fileName);
        await this.showFileActions(filePath);
      } else {
        // アクションが選択された場合はアクションを実行してループを抜ける
        // 空文字（ドライブ一覧）の場合はフォルダアクションを実行しない
        if (currentFolderPath !== "") {
          const action = selection.description;
          await this.executeFolderAction(action, currentFolderPath);
        }
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
