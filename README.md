# FortiGate Debug Command Generator

A web-based tool for generating FortiGate firewall debug CLI commands based on troubleshooting scenarios. This application helps network engineers quickly generate the correct debug commands for various FortiGate troubleshooting topics.

## Features

- **Interactive Command Generation**: Select a troubleshooting topic and provide parameters to generate relevant debug commands
- **Multiple Troubleshooting Topics**:
  - Traffic / Policy / Session (Flow Debug)
  - IPsec VPN
  - SSL VPN
  - Routing and Connectivity (OSPF/BGP)
  - User Authentication / FSSO / SSO
  - High Availability (HA)
  - UTM (IPS, Application Control, Web Filter)
  - System / Performance

- **Flexible Input Parameters**:
  - Source IP address (optional)
  - Destination IP address (optional)
  - Protocol (ICMP/TCP/UDP - optional)
  - Destination port (optional)

- **Smart Command Organization**:
  - Commands organized by section (Debug, Flow Trace, Sniffer, etc.)
  - Individual copy buttons for each section
  - Individual copy buttons for each sniffer command
  - Automatic comment removal (comments cause CLI errors)

- **Secure API Key Storage** (Optional):
  - Password-based encryption for OpenAI API keys
  - Uses Web Crypto API (AES-256-GCM)
  - Keys stored locally in browser only
  - ChatGPT integration for troubleshooting suggestions

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server or installation required - runs entirely in the browser

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/Fortigate_Troubleshooting_command_generator.git
cd Fortigate_Troubleshooting_command_generator
```

2. Open `index.html` in your web browser:
   - Simply double-click the file, or
   - Use a local web server (recommended):
     ```bash
     # Python 3
     python3 -m http.server 8000
     
     # Python 2
     python -m SimpleHTTPServer 8000
     
     # Node.js (with http-server)
     npx http-server
     ```
   - Then navigate to `http://localhost:8000` in your browser

## Usage

1. **Fill in the form**:
   - Enter source IP (optional)
   - Enter destination IP (optional)
   - Select protocol (optional)
   - Enter destination port (optional)
   - Select troubleshooting topic (required)

2. **Generate commands**:
   - Click "Generate Commands"
   - Commands will be organized by section
   - Each section has a "Copy Code" button

3. **Copy commands**:
   - Click "Copy Code" on any section to copy all commands in that section
   - For sniffer commands, each command has its own copy button
   - Commands are automatically filtered to remove comments

4. **ChatGPT Integration** (Optional):
   - Enter your OpenAI API key in the settings section
   - Optionally save it encrypted with a password
   - Enable ChatGPT suggestions when generating commands
   - Get AI-powered troubleshooting recommendations

## File Structure

```
Fortigate_Troubleshooting_command_generator/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── app.js                  # Main application logic
├── crypto-utils.js         # Encryption utilities for API key storage
├── fortigate_debug_cheatsheet.txt  # Reference cheatsheet
└── README.md               # This file
```

## Security Notes

- **API Key Storage**: API keys are encrypted using AES-256-GCM encryption with password-based key derivation (PBKDF2)
- **Local Storage Only**: All data is stored locally in your browser's localStorage
- **No Server Required**: This is a client-side only application - no data is sent to any server except when using ChatGPT integration
- **Password Protection**: The encryption password is never stored - you must enter it each time to decrypt your API key

## Troubleshooting

### Commands not working?
- Ensure you're copying commands without comment lines (handled automatically)
- Verify IP addresses are in correct format (4 octets)
- Check that ports are within valid range (22-65535)

### ChatGPT not working?
- Verify your OpenAI API key is correct
- Check your OpenAI account has available quota/credits
- Ensure you have an active payment method if required
- See error messages for specific guidance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is provided as-is for educational and troubleshooting purposes. Always test commands in a non-production environment first. The authors are not responsible for any issues arising from the use of generated commands.

## Acknowledgments

- Based on the FortiGate Debug Cheat Sheet
- Uses Web Crypto API for secure encryption
- ChatGPT integration powered by OpenAI API

