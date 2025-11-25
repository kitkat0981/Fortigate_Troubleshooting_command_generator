// Input validation functions
function validateIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

function validatePort(port) {
    const portNum = parseInt(port, 10);
    return portNum >= 22 && portNum <= 65535;
}

function validateProtocol(proto) {
    return ['1', '6', '17'].includes(proto);
}

// Get protocol name for display
function getProtocolName(proto) {
    const protoMap = {
        '1': 'icmp',
        '6': 'tcp',
        '17': 'udp'
    };
    return protoMap[proto] || proto;
}

// Command generation functions
function generateGlobalDebug() {
    return `diag debug reset
diag debug disable
diag debug console timestamp enable
diag debug duration 0`;
}

function generateFlowDebug(srcip, daddr, proto, dstport) {
    let commands = `diag debug reset
diag debug disable
diag debug flow filter clear`;
    
    if (srcip) {
        commands += `\ndiag debug flow filter saddr ${srcip}`;
    }
    if (daddr) {
        commands += `\ndiag debug flow filter daddr ${daddr}`;
    }
    if (proto) {
        commands += `\ndiag debug flow filter proto ${proto}`;
    }
    if (dstport) {
        commands += `\ndiag debug flow filter dport ${dstport}`;
    }
    
    commands += `
diag debug flow show console enable
diag debug flow trace start 100
diag debug enable

# Stop when done:
# diag debug disable
# diag debug flow trace stop
# diag debug flow filter clear`;
    
    return commands;
}

function generateSessionTableCommands(srcip, daddr, proto, dstport) {
    let commands = `diagnose sys session filter clear`;
    
    if (srcip) {
        commands += `\ndiagnose sys session filter src ${srcip}`;
    }
    if (daddr) {
        commands += `\ndiagnose sys session filter dst ${daddr}`;
    }
    if (dstport) {
        commands += `\ndiagnose sys session filter dport ${dstport}`;
    }
    if (proto) {
        commands += `\ndiagnose sys session filter proto ${proto}`;
    }
    
    commands += `
diagnose sys session list
diagnose firewall iprope list`;
    
    return commands;
}

function generateNetworkDiagnosticsCommands() {
    return `execute ping-options repeat 5 size 1200
get system arp
diagnose ip arp list
diagnose netlink brctl list
get system interface
get sys interface physical
diagnose ip address list
get sys interface transceiver`;
}

function generateFortiGuardLoggingCommands() {
    return `diagnose debug rating
diagnose debug application update -1
diagnose debug enable
execute update-now
diagnose autoupdate status
diagnose autoupdate versions
diagnose log test
execute log filter
exec log display
execute log delete
execute log fortianalyzer testconnectivity`;
}

function generateSnifferCommands(srcip, daddr, proto, dstport, interface, verbosity, count) {
    // Return array of command objects for individual copy buttons
    const commands = [];
    
    // Set defaults
    const snifferInterface = interface && interface.trim() ? interface.trim() : 'any';
    const snifferVerbosity = verbosity && verbosity.trim() ? verbosity.trim() : '4';
    const snifferCount = count && count.trim() ? count.trim() : '100';
    
    // Validate count - if invalid, use default
    let validCount = snifferCount;
    const countNum = parseInt(snifferCount, 10);
    if (isNaN(countNum) || countNum < 0 || countNum > 9999) {
        validCount = '100';
    }
    
    // Build filter string combining all provided parameters
    const filterParts = [];
    
    if (srcip) {
        filterParts.push(`host ${srcip}`);
    }
    
    if (daddr) {
        filterParts.push(`host ${daddr}`);
    }
    
    if (dstport) {
        filterParts.push(`port ${dstport}`);
    }
    
    if (proto) {
        filterParts.push(`proto ${proto}`);
    }
    
    // Build filter string (empty string if no filters)
    const filterString = filterParts.length > 0 ? filterParts.join(' and ') : '';
    
    // Build descriptive label
    let labelParts = [];
    if (srcip) labelParts.push(`source ${srcip}`);
    if (daddr) labelParts.push(`destination ${daddr}`);
    if (proto) {
        const protoName = getProtocolName(proto);
        labelParts.push(`protocol ${protoName} (${proto})`);
    }
    if (dstport) labelParts.push(`port ${dstport}`);
    
    let label = 'Packet capture';
    if (labelParts.length > 0) {
        label += ` with ${labelParts.join(', ')}`;
    } else {
        label += ' (no filters)';
    }
    
    // Add interface, verbosity, and count info to label
    const labelDetails = [];
    if (snifferInterface !== 'any') {
        labelDetails.push(`interface: ${snifferInterface}`);
    }
    if (snifferVerbosity !== '4') {
        labelDetails.push(`verbosity: ${snifferVerbosity}`);
    }
    if (snifferCount !== '100') {
        labelDetails.push(`count: ${snifferCount}`);
    }
    if (labelDetails.length > 0) {
        label += ` (${labelDetails.join(', ')})`;
    }
    
    commands.push({
        label: label,
        command: `diag sniffer packet ${snifferInterface} "${filterString}" ${snifferVerbosity} ${validCount}`
    });
    
    return commands;
}

function generateIPsecCommands(srcip, daddr) {
    // Return array of subsections
    const subsections = [];
    
    // IKE negotiation debug subsection
    let ikeCommands = `diag debug reset
diag debug disable
diag debug console timestamp enable

# Note: Starting from v7.4.1, the command is 'diagnose vpn ike log filter'
# IKE negotiation debug
diagnose vpn ike log filter clear`;
    
    if (srcip) {
        ikeCommands += `\ndiagnose vpn ike log filter loc-addr4 ${srcip}`;
    }
    if (daddr) {
        ikeCommands += `\ndiagnose vpn ike log filter rem-addr4 ${daddr}`;
    }
    
    ikeCommands += `
diagnose debug app ike -1
diagnose debug enable

# Stop debug:
# diagnose debug disable
# diagnose debug app ike 0
# diagnose vpn ike log filter clear`;
    
    subsections.push({
        title: 'IKE Negotiation Debug',
        commands: ikeCommands
    });
    
    // IPsec traffic / selectors debug subsection
    const ipsecCommands = `diag debug reset
diag debug disable

# IPsec traffic / selectors debug
diag debug app IPsec -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app IPsec 0`;
    
    subsections.push({
        title: 'IPsec Traffic / Selectors Debug',
        commands: ipsecCommands
    });
    
    // Quick status checks subsection
    const statusCommands = `# Quick status checks
get router info routing-table all
diag vpn ike gateway list
diag vpn tunnel list`;
    
    subsections.push({
        title: 'Quick Status Checks',
        commands: statusCommands
    });
    
    return subsections;
}

function generateSSLVPNCommands() {
    // Return array of subsections
    const subsections = [];
    
    // Core SSL VPN debug subsection
    const coreCommands = `diag debug reset
diag debug disable

# Core SSL VPN debug
diag debug app sslvpn -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app sslvpn 0`;
    
    subsections.push({
        title: 'Core SSL VPN Debug',
        commands: coreCommands
    });
    
    // User authentication subsection
    const authCommands = `diag debug reset
diag debug disable

# User authentication (SAML/LDAP/RADIUS/etc.)
diag debug app fnbamd -1
diag debug app sslvpn -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app fnbamd 0
# diag debug app sslvpn 0`;
    
    subsections.push({
        title: 'User Authentication Debug',
        commands: authCommands
    });
    
    // VPN status subsection
    const statusCommands = `# VPN status
diag vpn ssl stats
diag vpn ssl list`;
    
    subsections.push({
        title: 'VPN Status',
        commands: statusCommands
    });
    
    return subsections;
}

function generateRoutingCommands() {
    // Return array of subsections
    const subsections = [];
    
    // General route table subsection
    const routeTableCommands = `# General route table
get router info routing-table all
get router info routing-table database

# ECMP / policy route issues
diagnose router policy list
diag ip route list`;
    
    subsections.push({
        title: 'Route Table Information',
        commands: routeTableCommands
    });
    
    // OSPF debug subsection
    const ospfCommands = `# OSPF debug (auto-disables after ~30 minutes)
diagnose ip router ospf all enable
diagnose ip router ospf level info`;
    
    subsections.push({
        title: 'OSPF Debug',
        commands: ospfCommands
    });
    
    // BGP debug subsection
    const bgpCommands = `diag debug reset
diag debug disable

# BGP debug
diag debug app bgp -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app bgp 0`;
    
    subsections.push({
        title: 'BGP Debug',
        commands: bgpCommands
    });
    
    return subsections;
}

function generateAuthCommands() {
    // Return array of subsections
    const subsections = [];
    
    // General auth engine subsection
    const generalAuthCommands = `diag debug reset
diag debug disable

# General auth engine
diag debug app fnbamd -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app fnbamd 0`;
    
    subsections.push({
        title: 'General Authentication Debug',
        commands: generalAuthCommands
    });
    
    // FSSO subsection
    const fssoCommands = `diag debug reset
diag debug disable

# FSSO (with proxy/explicit)
diag debug app fnbamd -1
diag debug app wad -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app fnbamd 0
# diag debug app wad 0`;
    
    subsections.push({
        title: 'FSSO Debug',
        commands: fssoCommands
    });
    
    // Check login sessions subsection
    const sessionCommands = `# Check login sessions
diag firewall auth list`;
    
    subsections.push({
        title: 'Check Login Sessions',
        commands: sessionCommands
    });
    
    return subsections;
}

function generateHACommands() {
    // Return array of subsections
    const subsections = [];
    
    // HA status subsection
    const statusCommands = `# HA status
get sys ha status
diag sys ha status
diag sys ha history`;
    
    subsections.push({
        title: 'HA Status',
        commands: statusCommands
    });
    
    // HA debug subsection
    const debugCommands = `diag debug reset
diag debug disable

# HA debug (be careful, can be quite verbose)
diag debug app hatalk -1
diag debug app had -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app hatalk 0
# diag debug app had 0`;
    
    subsections.push({
        title: 'HA Debug',
        commands: debugCommands
    });
    
    return subsections;
}

function generateUTMCommands() {
    // Return array of subsections
    const subsections = [];
    
    // IPS debug subsection
    const ipsCommands = `diag debug reset
diag debug disable

# IPS debug
diag debug app ipsmonitor -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app ipsmonitor 0`;
    
    subsections.push({
        title: 'IPS Debug',
        commands: ipsCommands
    });
    
    // Application Control / Web filtering subsection
    const wadCommands = `diag debug reset
diag debug disable

# Application Control / Web filtering via WAD
diag debug app wad -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app wad 0`;
    
    subsections.push({
        title: 'Application Control / Web Filtering (WAD)',
        commands: wadCommands
    });
    
    // Web filter status and debug subsection
    const urlfilterCommands = `# Web filter status
diag webfilter status

# Web filter debug
diag debug reset
diag debug disable
diag debug app urlfilter -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app urlfilter 0`;
    
    subsections.push({
        title: 'Web Filter Status and Debug',
        commands: urlfilterCommands
    });
    
    return subsections;
}

function generateSystemCommands() {
    // Return array of subsections
    const subsections = [];
    
    // CPU / memory subsection
    const performanceCommands = `# CPU / memory
get system status
execute time
get system performance status
get system performance top
diag sys top
diag sys session stat
diag sys session exp-stat
diag sys vd list
diag sys cmdb info
diag sys mpstat 5`;
    
    subsections.push({
        title: 'System Performance',
        commands: performanceCommands
    });
    
    // Process-level debug subsection
    const processCommands = `# Process-level debug
diag debug crashlog read
diag debug reset
diag debug disable
diag debug app miglogd -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app miglogd 0`;
    
    subsections.push({
        title: 'Process-Level Debug',
        commands: processCommands
    });
    
    // Hardware health subsection
    const hardwareCommands = `diagnose hardware sysinfo interrupts
diagnose hardware sysinfo memory
diagnose hardware deviceinfo disk
diagnose hardware test suite all
diagnose sys flash list
execute disk list`;
    
    subsections.push({
        title: 'Hardware Health Checks',
        commands: hardwareCommands
    });
    
    return subsections;
}

function generateCleanupCommands() {
    return `# Always turn it off when done
diag debug disable
diag debug reset
diag debug cli 0`;
}

// Generate commands based on topic
function generateCommands(topic, srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount) {
    const sections = [];
    let sectionNum = 1;
    const sessionTopics = ['traffic', 'ipsec', 'sslvpn', 'routing'];
    const networkTopics = ['traffic', 'routing', 'system'];
    const fortiguardTopics = ['utm', 'system'];
    
    // Always include global debug boilerplate
    sections.push({
        title: `${sectionNum++}. Global Debug Boilerplate`,
        commands: generateGlobalDebug(),
        type: 'string'
    });
    
    if (sessionTopics.includes(topic)) {
        sections.push({
            title: `${sectionNum++}. Session Table Workflow`,
            commands: generateSessionTableCommands(srcip, daddr, proto, dstport),
            type: 'string'
        });
    }
    
    // Topic-specific commands
    switch(topic) {
        case 'traffic':
            sections.push({
                title: `${sectionNum++}. Flow Debug Commands`,
                commands: generateFlowDebug(srcip, daddr, proto, dstport),
                type: 'string'
            });
            sections.push({
                title: `${sectionNum++}. Packet Capture (Sniffer)`,
                commands: generateSnifferCommands(srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount),
                type: 'sniffer' // Array of command objects
            });
            break;
            
        case 'ipsec':
            // IPsec returns array of subsections
            const ipsecSubsections = generateIPsecCommands(srcip, daddr);
            ipsecSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. IPsec VPN Debug - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            sections.push({
                title: `${sectionNum++}. Packet Capture (Sniffer)`,
                commands: generateSnifferCommands(srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount),
                type: 'sniffer'
            });
            break;
            
        case 'sslvpn':
            // SSL VPN returns array of subsections
            const sslvpnSubsections = generateSSLVPNCommands();
            sslvpnSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. SSL VPN Debug - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            sections.push({
                title: `${sectionNum++}. Packet Capture (Sniffer)`,
                commands: generateSnifferCommands(srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount),
                type: 'sniffer'
            });
            break;
            
        case 'routing':
            // Routing returns array of subsections
            const routingSubsections = generateRoutingCommands();
            routingSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. Routing Debug - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            sections.push({
                title: `${sectionNum++}. Packet Capture (Sniffer)`,
                commands: generateSnifferCommands(srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount),
                type: 'sniffer'
            });
            break;
            
        case 'auth':
            // Auth returns array of subsections
            const authSubsections = generateAuthCommands();
            authSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. Authentication Debug - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            break;
            
        case 'ha':
            // HA returns array of subsections
            const haSubsections = generateHACommands();
            haSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. High Availability - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            break;
            
        case 'utm':
            // UTM returns array of subsections
            const utmSubsections = generateUTMCommands();
            utmSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. UTM Debug - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            sections.push({
                title: `${sectionNum++}. Packet Capture (Sniffer)`,
                commands: generateSnifferCommands(srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount),
                type: 'sniffer'
            });
            break;
            
        case 'system':
            // System returns array of subsections
            const systemSubsections = generateSystemCommands();
            systemSubsections.forEach((subsection, idx) => {
                sections.push({
                    title: `${sectionNum}. System / Performance - ${subsection.title}`,
                    commands: subsection.commands,
                    type: 'string'
                });
            });
            sectionNum++;
            break;
    }
    
    if (fortiguardTopics.includes(topic)) {
        sections.push({
            title: `${sectionNum++}. FortiGuard & Logging Helpers`,
            commands: generateFortiGuardLoggingCommands(),
            type: 'string'
        });
    }
    
    // Always include cleanup at the end
    sections.push({
        title: `${sectionNum++}. Cleanup Commands`,
        commands: generateCleanupCommands(),
        type: 'string'
    });
    
    if (networkTopics.includes(topic)) {
        sections.push({
            title: `${sectionNum++}. Network Diagnostics Quick Reference (Optional)`,
            commands: generateNetworkDiagnosticsCommands(),
            type: 'string'
        });
    }
    
    return sections;
}

// Filter out comment lines (lines starting with #)
function filterComments(text) {
    if (!text) return '';
    return text.split('\n')
        .filter(line => {
            const trimmed = line.trim();
            // Filter out lines that start with # (comments)
            return trimmed.length > 0 && !trimmed.startsWith('#');
        })
        .join('\n');
}

// Copy to clipboard function with fallback
async function copyToClipboard(text, button) {
    // Filter out comment lines before copying
    const filteredText = filterComments(text);
    
    // Try modern Clipboard API first, fallback to execCommand if it fails
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(filteredText);
        } else {
            throw new Error('Clipboard API not available');
        }
    } catch (err) {
        // Fallback to execCommand for non-secure contexts or when Clipboard API fails
        try {
            const textArea = document.createElement('textarea');
            textArea.value = filteredText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (!successful) {
                throw new Error('execCommand copy failed');
            }
        } catch (fallbackErr) {
            console.error('Failed to copy:', fallbackErr);
            alert('Failed to copy to clipboard. Please select and copy manually.');
            return;
        }
    }
    
    // Success - update button UI
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
    }, 2000);
}

// Render command sections
function renderCommands(sections) {
    const container = document.getElementById('commandSections');
    container.innerHTML = '';
    
    sections.forEach((section, index) => {
        // Handle sniffer commands (array of command objects)
        if (section.type === 'sniffer' && Array.isArray(section.commands)) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'command-section';
            
            const header = document.createElement('div');
            header.className = 'command-section-header';
            header.innerHTML = `<span>${section.title}</span>`;
            sectionDiv.appendChild(header);
            
            // Add info about verbosity levels
            const infoDiv = document.createElement('div');
            infoDiv.style.padding = '10px 20px';
            infoDiv.style.background = '#f8f9fa';
            infoDiv.style.borderBottom = '1px solid var(--border-color)';
            infoDiv.style.fontSize = '0.9em';
            infoDiv.style.color = '#666';
            infoDiv.innerHTML = '<strong>Note:</strong> Run one command at a time. Verbosity levels: 1=header only, 2=header+IP data, 3=header+ethernet data, 4=header+interface (default), 5=header+IP data+interface, 6=header+ethernet data+interface';
            sectionDiv.appendChild(infoDiv);
            
            // Render each sniffer command with its own copy button
            section.commands.forEach((cmdObj, cmdIndex) => {
                const cmdDiv = document.createElement('div');
                cmdDiv.style.padding = '15px 20px';
                cmdDiv.style.borderBottom = '1px solid var(--border-color)';
                
                const cmdLabel = document.createElement('div');
                cmdLabel.style.marginBottom = '8px';
                cmdLabel.style.fontSize = '0.9em';
                cmdLabel.style.color = '#666';
                cmdLabel.textContent = cmdObj.label;
                cmdDiv.appendChild(cmdLabel);
                
                const cmdContent = document.createElement('div');
                cmdContent.style.display = 'flex';
                cmdContent.style.justifyContent = 'space-between';
                cmdContent.style.alignItems = 'center';
                cmdContent.style.gap = '10px';
                
                const cmdPre = document.createElement('pre');
                cmdPre.className = 'command-content';
                cmdPre.style.margin = '0';
                cmdPre.style.flex = '1';
                cmdPre.style.padding = '10px';
                cmdPre.textContent = cmdObj.command;
                cmdContent.appendChild(cmdPre);
                
                const cmdCopyBtn = document.createElement('button');
                cmdCopyBtn.className = 'copy-btn';
                cmdCopyBtn.textContent = 'Copy';
                cmdCopyBtn.addEventListener('click', () => {
                    copyToClipboard(cmdObj.command, cmdCopyBtn);
                });
                cmdContent.appendChild(cmdCopyBtn);
                
                cmdDiv.appendChild(cmdContent);
                sectionDiv.appendChild(cmdDiv);
            });
            
            container.appendChild(sectionDiv);
        } else {
            // Handle regular string commands
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'command-section';
            
            const header = document.createElement('div');
            header.className = 'command-section-header';
            header.innerHTML = `
                <span>${section.title}</span>
                <button class="copy-btn" data-index="${index}">Copy Code</button>
            `;
            
            // Filter out comments before displaying
            const filteredCommands = filterComments(section.commands);
            
            const content = document.createElement('pre');
            content.className = 'command-content';
            content.textContent = filteredCommands;
            
            sectionDiv.appendChild(header);
            sectionDiv.appendChild(content);
            container.appendChild(sectionDiv);
            
            // Add click handler for copy button - use filtered commands
            const copyBtn = sectionDiv.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(filteredCommands, copyBtn);
            });
        }
    });
    
    // Show output panel
    document.getElementById('outputPanel').style.display = 'block';
    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// Wait for DOM to be ready before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing form handlers...');
    
    // Form submission handler
    const configForm = document.getElementById('configForm');
    if (!configForm) {
        console.error('configForm not found!');
        return;
    }
    
    console.log('Form found, attaching submit handler...');
    
    configForm.addEventListener('submit', (e) => {
        console.log('Form submitted!');
        e.preventDefault();
        
        const srcip = document.getElementById('srcip').value.trim();
        const daddr = document.getElementById('daddr').value.trim();
        const proto = document.getElementById('proto').value;
        const dstport = document.getElementById('dstport').value;
        const topic = document.getElementById('troubleshootTopic').value;
        const snifferInterface = document.getElementById('snifferInterface').value.trim();
        const snifferVerbosity = document.getElementById('snifferVerbosity').value;
        const snifferCount = document.getElementById('snifferCount').value.trim();
        
        // Validation - only validate if fields are provided
        if (srcip && !validateIP(srcip)) {
            alert('Please enter a valid source IP address or leave it empty');
            return;
        }
        
        if (daddr && !validateIP(daddr)) {
            alert('Please enter a valid destination IP address or leave it empty');
            return;
        }
        
        if (proto && !validateProtocol(proto)) {
            alert('Please select a valid protocol (1, 6, or 17) or leave it unselected');
            return;
        }
        
        if (dstport && !validatePort(dstport)) {
            alert('Please enter a valid destination port (22-65535) or leave it empty');
            return;
        }
        
        // Validate sniffer count if provided
        if (snifferCount) {
            const countNum = parseInt(snifferCount, 10);
            if (isNaN(countNum) || countNum < 1 || countNum > 9999) {
                alert('Please enter a valid packet count (1-9999) or leave it empty for default (100)');
                return;
            }
        }
        
        if (!topic) {
            alert('Please select a troubleshooting topic');
            return;
        }
        
        // Generate and render commands
        try {
            console.log('Generating commands with:', { topic, srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount });
            const sections = generateCommands(topic, srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount);
            console.log('Generated sections:', sections);
            renderCommands(sections);
            console.log('Commands rendered successfully');
        } catch (error) {
            console.error('Error generating commands:', error);
            console.error('Error stack:', error.stack);
            alert('An error occurred while generating commands: ' + error.message + '. Please check the console for details.');
        }
    });
    
    // Real-time validation feedback - only validate if fields have values
    const srcipInput = document.getElementById('srcip');
    if (srcipInput) {
        srcipInput.addEventListener('blur', function() {
            if (this.value.trim() && !validateIP(this.value.trim())) {
                this.setCustomValidity('Please enter a valid IP address (e.g., 192.168.1.100) or leave empty');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    const daddrInput = document.getElementById('daddr');
    if (daddrInput) {
        daddrInput.addEventListener('blur', function() {
            if (this.value.trim() && !validateIP(this.value.trim())) {
                this.setCustomValidity('Please enter a valid IP address (e.g., 10.0.0.1) or leave empty');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    const dstportInput = document.getElementById('dstport');
    if (dstportInput) {
        dstportInput.addEventListener('blur', function() {
            if (this.value.trim() && !validatePort(this.value.trim())) {
                this.setCustomValidity('Please enter a port between 22 and 65535 or leave empty');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    console.log('All event listeners attached successfully');
    
    // Initialize collapsible section (sniffer options)
    const snifferToggle = document.getElementById('snifferToggle');
    const snifferContent = document.getElementById('snifferContent');
    const snifferSection = snifferToggle?.closest('.collapsible-section');
    
    if (snifferToggle && snifferSection) {
        // Start collapsed
        snifferSection.classList.add('collapsed');
        
        snifferToggle.addEventListener('click', function() {
            snifferSection.classList.toggle('collapsed');
        });
    }
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    
    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme, themeIcon);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme, themeIcon);
        });
    }
});

function updateThemeIcon(theme, iconElement) {
    if (iconElement) {
        // Dark theme shows sun (to switch to light), light theme shows moon (to switch to dark)
        iconElement.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}


