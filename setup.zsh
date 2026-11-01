#!/bin/zsh

# Setup Script for tools on Mac

#
# Step (Manual): Make setup.zsh executable
#

# Give permissions to run the setup script
# chmod +x setup.zsh

#
# Step: Get the tools directory
#

# The tools directory is the directory where this script is located
script_dir=${0:A:h}
#echo "script dir: $script_dir"

#
# Step: Make the t script executable
# 

chmod +x "${script_dir}/t"

#
# Step: Add the tools directory to the PATH environment variable
#

# Replace $HOME directory value with $HOME for use in export.
if [[ "$script_dir" == "$HOME" || "$script_dir" == "$HOME/"* ]]; then
    script_dir="\$HOME${script_dir#"$HOME"}"
fi
echo "script dir: $script_dir"

# Add tools to PATH environment variable
# nano ~/.zshrc


env_file=~/.zshrc

echo "
Adding statements to env file: "$env_file"
"

for statement in "# Tools" "export PATH=\"$script_dir:\$PATH\"" 'export r="$HOME/Documents/GitHub"'; do

# Check if the statement already exists in .zshrc to avoid duplicates
if ! grep -Fxq -- "${statement}" "$env_file"; then
    # Append the statement to .zshrc
    echo "${statement}" >> "$env_file"
    echo "Statement added:
'${statement}'
"
else
    echo "Statement already exists:
'${statement}'
"
fi
done

#
# Step: make sure path is updates in terminal
#

echo "Setup complete!"
echo "Please restart your terminal or run 'source ~/.zshrc' to apply the changes."
echo "Verify everything is working by running the 't hello' command in terminal."