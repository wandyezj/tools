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
script_dir=$(dirname $0)
#echo "script dir: $script_dir"

#
# Step: Make the t script executable
# 

chmod +x "${script_dir}/t"

#
# Step: Add the tools directory to the PATH environment variable
#

# Add tools to PATH environment variable
# nano ~/.zshrc

env_file=~/.zshrc
export_statement="export PATH=\"$script_dir:\$PATH\""

# Check if the export statement already exists in .zshrc to avoid duplicates
if ! grep -q "${export_statement}" $env_file; then
    # Append the export statement to .zshrc
    echo "${export_statement}" >> $env_file
    echo "Added export statement to: $env_file
'${export_statement}'"
else
    echo "Export statement already in: $env_file
'${export_statement}'"
fi

#
# Step: make sure path is updates in terminal
#

echo "Setup complete! Please restart your terminal or run 'source ~/.zshrc' to apply the changes."
echo "Verify everything is working by running the 't hello' command in terminal."