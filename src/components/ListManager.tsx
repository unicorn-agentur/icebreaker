'use client';

import { useRouter } from 'next/navigation';

// ... (ListStat type definition)

export function ListManager({ onListDeleted }: { onListDeleted?: () => void }) {
  const router = useRouter();
  const [lists, setLists] = useState<ListStat[]>([]);
  // ... (rest of state)

  // ... (fetchListStats function)

  // ... (handleDeleteList function)

  const handleSelectList = (listName: string) => {
      router.push(`/icebreaker?list=${encodeURIComponent(listName)}`);
  };

  // ... (loading and empty checks)

  return (
    <div className="space-y-6">
      {/* ... (Header) */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <Card 
            key={list.name} 
            className="overflow-hidden hover:shadow-md transition-all border-l-4 border-l-primary/50 cursor-pointer group"
            onClick={() => handleSelectList(list.name)}
          >
            <CardHeader className="pb-3 bg-gray-50/50 dark:bg-gray-800/50 group-hover:bg-primary/5 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors" title={list.name}>
                    {list.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {list.total} Leads gesamt
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 z-10"
                  onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.name);
                  }}
                  disabled={deleting === list.name}
                  title="Liste löschen"
                >
                  {deleting === list.name ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {/* ... (CardContent remains same) */}
          </Card>
        ))}
      </div>
    </div>
  );
}
