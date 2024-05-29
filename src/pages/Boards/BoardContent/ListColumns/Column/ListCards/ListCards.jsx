
import Box from '@mui/material/Box'
import Card from './Card/Card'


function ListCards({ cards }) {
  return (
    <Box sx={{
      padding: '0 5px',
      margin: '0 5px',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: (theme) => `calc(${theme.trello.boardContentHeight} -
              ${theme.spacing(5)} -
              ${theme.trello.columnHeaderHeight} -
              ${theme.trello.columnFooterHeight}
            )`,
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#95a5a6',
        borderRadius: '8px'
      },
      '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: '#7f8c8d',
        borderRadius: '8px'
      }
    }}>
      {cards?.map(card => {
        return <Card key={card._id} card={card}/>
      })}

    </Box>

  )
}

export default ListCards
