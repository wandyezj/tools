# Zsh

[Z Shell](https://en.wikipedia.org/wiki/Z_shell)

## Configure .zshrc

Update prompt to show current working directory followed by %

```text
PROMPT='%~%# '
```

## Install Zsh

note: Z Shell is the default shell for Mac OS.

```text
sudo apt update
sudo apt install zsh
```

## Set Zsh as default shell

```text
chsh -s $(which zsh)
```

