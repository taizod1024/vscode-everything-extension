[日本語](#everything-extension-ja) | [English](#everything-extension-en)

# Everything Extension (ja)

Everything を使ってファイルとフォルダを迅速に検索します。  
設定により WSL のファイルの検索、および WSL からファイルの検索を実施できます。

## 準備

1. [Everything](https://www.voidtools.com/) をインストールします。
2. Everything の [オプション]-[HTTP サーバ]から[HTTP サーバを有効]をチェックします。
   ![ee01_ja](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee01_ja.png?raw=true)

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

### Everything の HTTP サーバのポート番号が 80 番以外の場合

Everything の HTTP サーバのポート番号が 80 番以外の場合は、vscode の[設定]から変更します。
![ee04](https://github.com/taizod1024/vscode-everything-extension/blob/main/images/ee04.png?raw=true)

### WSL のファイルを検索する場合の設定

WSL のファイルを検索する場合は、 Everything の [オプション]-[検索データ]-[フォルダ]に`\\wsl.localhost\ディストリビューション名`を追加します。

### WSL からファイルを検索する場合の設定

WSL からファイルを検索する場合は、Windows ファイアウォールの受信規則を追加します。

# Everything Extension (en)

working
