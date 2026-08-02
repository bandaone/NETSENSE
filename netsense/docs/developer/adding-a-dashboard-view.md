# Adding a Dashboard View

This guide explains how to add a new view/route to the React dashboard.

## 1. Create the component
In `frontend/src/components/views/YourView.tsx`:

```tsx
import React from 'react';

const YourView: React.FC = () => {
	return <div>Your new view content</div>;
};

export default YourView;
```

## 2. Add the route
In `frontend/src/routes.tsx`:

```tsx
const YourView = React.lazy(() => import('./components/views/YourView'));

// In route definition:
{
	path: '/your-view',
	component: YourView,
	requiredRole: 'engineer', // 'engineer' | 'senior' | 'admin'
}
```

## 3. Add navigation (if needed)
In the navigation component, add a link:

```tsx
<NavLink to="/your-view">Your View</NavLink>
```

## 4. Connect to API (if data needed)
Use TanStack Query:

```tsx
const { data, isLoading } = useQuery({
	queryKey: ['your-data'],
	queryFn: () => fetchApi('/api/your-endpoint'),
});
```

## 5. Add WebSocket subscription (if real-time)

```tsx
useEffect(() => {
	const ws = new WebSocket(`ws://host/ws/your-stream?token=${token}`);
	ws.onmessage = (event) => {
		// handle message
	};
	return () => ws.close();
}, []);
```

## 6. Add tests
In `frontend/src/components/views/__tests__/YourView.test.tsx`:

```tsx
test('renders correctly', () => {
	render(<YourView />);
	expect(screen.getByText('Your new view content')).toBeInTheDocument();
});
```

## 7. Update documentation
Add a description of the new view to `user/dashboard-guide.md`.

