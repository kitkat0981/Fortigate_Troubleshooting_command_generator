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
diag debug console timestamp enable`;
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

# IKE negotiation debug
diag vpn ike log-filter clear`;
    
    if (srcip) {
        ikeCommands += `\ndiag vpn ike log-filter src-addr4 ${srcip}`;
    }
    if (daddr) {
        ikeCommands += `\ndiag vpn ike log-filter dst-addr4 ${daddr}`;
    }
    
    ikeCommands += `
diag debug app ike -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app ike 0
# diag vpn ike log-filter clear`;
    
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
get router info policy
diag ip route list`;
    
    subsections.push({
        title: 'Route Table Information',
        commands: routeTableCommands
    });
    
    // OSPF debug subsection
    const ospfCommands = `diag debug reset
diag debug disable

# OSPF debug
diag debug app ospfd -1
diag debug enable

# Stop debug:
# diag debug disable
# diag debug app ospfd 0`;
    
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
diag sys top
get system performance status
get system performance top`;
    
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
    
    // Always include global debug boilerplate
    sections.push({
        title: `${sectionNum++}. Global Debug Boilerplate`,
        commands: generateGlobalDebug(),
        type: 'string'
    });
    
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
                commands: generateSnifferCommands(srcip, daddr, proto, dstport),
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
    
    // Always include cleanup at the end
    sections.push({
        title: `${sectionNum}. Cleanup Commands`,
        commands: generateCleanupCommands(),
        type: 'string'
    });
    
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

// Copy to clipboard function
async function copyToClipboard(text, button) {
    try {
        // Filter out comment lines before copying
        const filteredText = filterComments(text);
        await navigator.clipboard.writeText(filteredText);
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please select and copy manually.');
    }
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


// Form submission handler
document.getElementById('configForm').addEventListener('submit', (e) => {
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
    const sections = generateCommands(topic, srcip, daddr, proto, dstport, snifferInterface, snifferVerbosity, snifferCount);
    renderCommands(sections);
});

// Real-time validation feedback - only validate if fields have values
document.getElementById('srcip').addEventListener('blur', function() {
    if (this.value.trim() && !validateIP(this.value.trim())) {
        this.setCustomValidity('Please enter a valid IP address (e.g., 192.168.1.100) or leave empty');
    } else {
        this.setCustomValidity('');
    }
});

document.getElementById('daddr').addEventListener('blur', function() {
    if (this.value.trim() && !validateIP(this.value.trim())) {
        this.setCustomValidity('Please enter a valid IP address (e.g., 10.0.0.1) or leave empty');
    } else {
        this.setCustomValidity('');
    }
});

document.getElementById('dstport').addEventListener('blur', function() {
    if (this.value.trim() && !validatePort(this.value.trim())) {
        this.setCustomValidity('Please enter a port between 22 and 65535 or leave empty');
    } else {
        this.setCustomValidity('');
    }
});


