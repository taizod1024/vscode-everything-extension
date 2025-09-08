[日本語](#everything-extension-ja) | [English](#everything-extension-en)

---

# Everything Extension (ja)

Everything を使ってファイルとフォルダを迅速に検索します。  
設定によっては WSL のファイルの検索、および WSL からファイルの検索も可能です。

## 準備

1. [Everything](https://www.voidtools.com/) をインストールします。
2. Everything の [オプション]-[HTTP サーバ]から[HTTP サーバを有効]をチェックします。  
   ![ee01](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee01.png?raw=true)

## 基本操作

### ファイルやフォルダを検索してアクションを実行

1. `Ctrl + Alt + L` を押します。
2. ファイル名やフォルダ名の一部を入力します。  
    キー入力する毎に Everything で検索した結果を最大 32 項目表示します。  
    `*`を入力すると表示されている項目の順序が変わります。  
   ![ee02](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee02.png?raw=true)
3. Enter キーで項目を選択します。
4. 選択した項目に対するアクションを選択します。  
   ![ee03](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee03.png?raw=true)
   - ファイルの場合
     - Open file with VS Code
     - Open folder with VS Code
     - Open folder with Explorer (Windows のみ)
     - Open folder with Terminal
     - Open folder with CMD (Windows のみ)
     - Open folder with CMD as administrator (Windows のみ)
     - Open folder with PowerShell (Windows のみ)
     - Open folder with PowerShell as administrator (Windows のみ)
     - Open file with the default application (Windows のみ)
     - Copy path to clipboard
     - Search everything
   - フォルダの場合
     - Open folder with VS Code
     - Open folder with Explorer (Windows のみ)
     - Open folder with Terminal
     - Open folder with CMD (Windows のみ)
     - Open folder with CMD as administrator (Windows のみ)
     - Open folder with PowerShell (Windows のみ)
     - Open folder with PowerShell as administrator (Windows のみ)
     - Copy path to clipboard
     - Search everything
5. アクションを実行します。

### 開いているファイルに対してアクションを実行

1. ファイルを開いている状態で`Shift + Alt + L` を押します。
2. 前述のファイルの場合のアクションを実行します。

## 設定

### Everything の HTTP サーバのポート番号が 80 番以外の場合の設定

Everything の HTTP サーバのポート番号が 80 番以外の場合は、vscode の[設定]から HTTP サーバの URL を`http://localhost:ポート番号`に変更します。  
![ee04](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee04.png?raw=true)

### WSL のファイルを検索する場合の設定

WSL のファイルを検索する場合は、 Everything の [オプション]-[検索データ]-[フォルダ]に`\\wsl.localhost\ディストリビューション名`を追加します。  
![ee05](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee05.png?raw=true)

### WSL からファイルを検索する場合の設定

WSL からファイルを検索する場合は以下の設定をします。

1. WSL Settings を起動して、[ネットワーク]メニューを選択し、[ネットワークモード]を"Mirrored"に変更します。
2. 変更した場合はコマンドプロンプトから `wsl --shutdown` をして WSL に反映します。

---

# Everything Extension (en)

Quickly search for files and folders using Everything.  
Depending on the settings, you can search for WSL files and also search for files from WSL.

## Preparation

1. Install [Everything](https://www.voidtools.com/).
2. In Everything, go to [Options] - [HTTP Server] and check [Enable HTTP Server].

## Basic Usage

### Search for files or folders and perform actions

1. Press `Ctrl + Alt + L`.
2. Enter part of the file or folder name.  
   Up to 32 results from Everything will be displayed as you type.  
   Entering `*` will change the order of the displayed items.
3. Select an item with the Enter key.
4. Choose an action for the selected item.
   - For files:
     - Open file with VS Code
     - Open folder with VS Code
     - Open folder with Explorer (Windows only)
     - Open folder with Terminal
     - Open folder with CMD (Windows only)
     - Open folder with CMD as administrator (Windows only)
     - Open folder with PowerShell (Windows only)
     - Open folder with PowerShell as administrator (Windows only)
     - Open file with the default application (Windows only)
     - Copy path to clipboard
     - Search everything
   - For folders:
     - Open folder with VS Code
     - Open folder with Explorer (Windows only)
     - Open folder with Terminal
     - Open folder with CMD (Windows only)
     - Open folder with CMD as administrator (Windows only)
     - Open folder with PowerShell (Windows only)
     - Open folder with PowerShell as administrator (Windows only)
     - Copy path to clipboard
     - Search everything
5. The selected action will be executed.

### Perform actions on the currently opened file

1. With a file open, press `Shift + Alt + L`.
2. Perform the same actions as for files above.

## Settings

### If the HTTP server port for Everything is not 80

If the HTTP server port for Everything is not 80, change the HTTP server URL in VS Code [Settings] to `http://localhost:<port>`.

### To search for WSL files

To search for WSL files, add `\\wsl.localhost\<DistributionName>` to [Options] - [Indexes] - [Folders] in Everything.

### To search for files from WSL

To search for files from WSL, configure as follows:

1. Open WSL Settings, select the [Network] menu, and change the [Network Mode] to "Mirrored".
2. If you make changes, run `wsl --shutdown` from the Command Prompt to apply them to WSL.
