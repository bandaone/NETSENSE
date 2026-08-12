package topology

type Snapshot struct {
	SchemaVersion       string          `json:"schemaVersion"`
	SnapshotID          string          `json:"snapshotId"`
	TenantID            string          `json:"tenantId"`
	Organisation        Organisation    `json:"organisation"`
	Site                Site            `json:"site"`
	GeneratedAt         string          `json:"generatedAt"`
	ObservedAt          string          `json:"observedAt"`
	CoverageSummary     CoverageSummary `json:"coverageSummary"`
	Nodes               []Node          `json:"nodes"`
	Interfaces          []Interface     `json:"interfaces"`
	Relationships       []Relationship  `json:"relationships"`
	Evidence            []Evidence      `json:"evidence"`
	Synthetic           bool            `json:"synthetic"`
	SyntheticDataNotice *string         `json:"syntheticDataNotice"`
}

type Organisation struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Site struct {
	ID             string `json:"id"`
	OrganisationID string `json:"organisationId"`
	Name           string `json:"name"`
}

type CoverageSummary struct {
	TotalEntities int `json:"totalEntities"`
	Full          int `json:"full"`
	Partial       int `json:"partial"`
	None          int `json:"none"`
	Unsupported   int `json:"unsupported"`
}

type Node struct {
	ID                     string      `json:"id"`
	Kind                   string      `json:"kind"`
	DisplayName            string      `json:"displayName"`
	Role                   string      `json:"role"`
	Identifiers            Identifiers `json:"identifiers"`
	ParentID               *string     `json:"parentId"`
	OperationalCriticality int         `json:"operationalCriticality"`
	LifecycleState         string      `json:"lifecycleState"`
	Assessment             Assessment  `json:"assessment"`
	Tags                   []string    `json:"tags"`
	EvidenceIDs            []string    `json:"evidenceIds"`
}

type Identifiers struct {
	Hostnames     []string `json:"hostnames"`
	IPAddresses   []string `json:"ipAddresses"`
	MACAddresses  []string `json:"macAddresses"`
	SerialNumbers []string `json:"serialNumbers"`
}

type Assessment struct {
	OperationalHealth string   `json:"operationalHealth"`
	Freshness         string   `json:"freshness"`
	Coverage          string   `json:"coverage"`
	ManagementState   string   `json:"managementState"`
	Confidence        float64  `json:"confidence"`
	AssessedAt        string   `json:"assessedAt"`
	ReasonCodes       []string `json:"reasonCodes"`
	EvidenceIDs       []string `json:"evidenceIds"`
}

type Interface struct {
	ID               string   `json:"id"`
	DeviceID         string   `json:"deviceId"`
	Name             string   `json:"name"`
	MACAddresses     []string `json:"macAddresses"`
	Addresses        []string `json:"addresses"`
	Media            string   `json:"media"`
	SpeedBPS         *uint64  `json:"speedBps"`
	AdminState       string   `json:"adminState"`
	OperationalState string   `json:"operationalState"`
	VLAN             VLAN     `json:"vlan"`
	EvidenceIDs      []string `json:"evidenceIds"`
}

type VLAN struct {
	Mode        string `json:"mode"`
	Memberships []int  `json:"memberships"`
}

type Relationship struct {
	ID               string               `json:"id"`
	Source           RelationshipEndpoint `json:"source"`
	Target           RelationshipEndpoint `json:"target"`
	RelationshipType string               `json:"relationshipType"`
	Directionality   string               `json:"directionality"`
	Status           string               `json:"status"`
	Confidence       float64              `json:"confidence"`
	FirstObservedAt  string               `json:"firstObservedAt"`
	LastObservedAt   string               `json:"lastObservedAt"`
	EvidenceIDs      []string             `json:"evidenceIds"`
	ExpiresAt        *string              `json:"expiresAt"`
	KnowledgeKind    string               `json:"knowledgeKind"`
}

type RelationshipEndpoint struct {
	NodeID string `json:"nodeId"`
}

type Evidence struct {
	ID                     string   `json:"id"`
	SourceType             string   `json:"sourceType"`
	CollectorID            string   `json:"collectorId"`
	ObservedAt             string   `json:"observedAt"`
	ExpiresAt              *string  `json:"expiresAt"`
	Summary                string   `json:"summary"`
	ConfidenceContribution float64  `json:"confidenceContribution"`
	Limitations            []string `json:"limitations"`
}
