import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Home } from "@/pages/home";
import { Order } from "@/pages/order";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/order/:id" component={Order} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
