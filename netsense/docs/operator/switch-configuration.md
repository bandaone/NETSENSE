# Switch SPAN/Mirror Configuration Guide

## Cisco IOS
```
enable
configure terminal
monitor session 1 source vlan 1 - 100 both
monitor session 1 destination interface GigabitEthernet0/24 encapsulation replicate
end
```

Replace VLAN range and interface as needed. Port 24 will be the mirror port.

## Cisco NX-OS
```
configure terminal
monitor session 1
source vlan 1-100 both
destination interface Ethernet1/24
no shut
end
```

## Juniper Junos
```
set ethernet-switching-options analyzer mirror-monitor input vlan all output interface ge-0/0/24
commit
```

## HP/Aruba
```
configure terminal
mirror-port 24
interface 1-23 monitor all both mirror 24
end
write memory
```

## Generic (If Your Switch Is Not Listed)
1. Look for "Port Mirroring," "SPAN," or "Monitor Session" in the switch's web interface or CLI.
2. Select the source ports or VLANs you want to monitor. Usually, you want all VLANs or all ports that carry production traffic.
3. Set the destination port to the port connected to the probe's MIRROR port.
4. Ensure the destination port is set to "monitor" or "mirror" mode, not a normal access port.
5. Some switches require disabling spanning tree on the mirror port.

## Verification
After configuration, connect a laptop (instead of the probe) to the mirror port and run Wireshark. You should see traffic from other ports. If not, re-check the SPAN configuration.

