import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOutfitCalendar } from '@/hooks/useOutfitCalendar';
import { useOutfits } from '@/hooks/useOutfits';
import { CalendarDays, Plus, Trash2, Edit } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { entries, loading, addToCalendar, removeFromCalendar } = useOutfitCalendar();
  const { outfits } = useOutfits();

  const getEntryForDate = (date: Date) => {
    return entries.find(entry => 
      isSameDay(new Date(entry.scheduled_date), date)
    );
  };

  const handleAddToCalendar = async () => {
    if (!selectedDate || !selectedOutfitId) return;
    
    await addToCalendar(selectedOutfitId, selectedDate, notes);
    setDialogOpen(false);
    setSelectedOutfitId('');
    setNotes('');
  };

  const selectedEntry = selectedDate ? getEntryForDate(selectedDate) : null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <CalendarDays className="w-10 h-10" />
          Outfit Calendar
        </h1>
        <p className="text-muted-foreground">Plan your outfits for upcoming events and occasions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Select a Date</CardTitle>
            <CardDescription>Click on a date to view or schedule an outfit</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                scheduled: entries.map(e => new Date(e.scheduled_date))
              }}
              modifiersClassNames={{
                scheduled: 'bg-primary text-primary-foreground font-bold'
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedEntry ? 'Scheduled outfit' : 'No outfit scheduled'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEntry ? (
              <div className="space-y-4">
                {selectedEntry.outfit?.generated_image_url && (
                  <img 
                    src={selectedEntry.outfit.generated_image_url} 
                    alt={selectedEntry.outfit.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{selectedEntry.outfit?.title}</h3>
                  {selectedEntry.outfit?.mood && (
                    <p className="text-sm text-muted-foreground">Mood: {selectedEntry.outfit.mood}</p>
                  )}
                  {selectedEntry.notes && (
                    <p className="text-sm mt-2 p-3 bg-muted rounded-md">{selectedEntry.notes}</p>
                  )}
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => removeFromCalendar(selectedEntry.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from Calendar
                </Button>
              </div>
            ) : (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={!selectedDate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Outfit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Schedule Outfit for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Outfit</label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={selectedOutfitId}
                        onChange={(e) => setSelectedOutfitId(e.target.value)}
                      >
                        <option value="">Choose an outfit...</option>
                        {outfits.map(outfit => (
                          <option key={outfit.id} value={outfit.id}>
                            {outfit.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                      <Textarea
                        placeholder="Add notes about the occasion or outfit..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button 
                      onClick={handleAddToCalendar}
                      disabled={!selectedOutfitId}
                      className="w-full"
                    >
                      Add to Calendar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Outfits */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upcoming Outfits</CardTitle>
          <CardDescription>Your scheduled outfits for the next events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground">No outfits scheduled yet</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entries.slice(0, 6).map(entry => (
                <Card key={entry.id} className="overflow-hidden">
                  {entry.outfit?.generated_image_url && (
                    <img 
                      src={entry.outfit.generated_image_url}
                      alt={entry.outfit.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <CardContent className="p-4">
                    <p className="font-semibold">{entry.outfit?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.scheduled_date), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}